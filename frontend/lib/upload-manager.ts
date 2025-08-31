// API client configuration - same as api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_GO_API_URL || "";

export interface UploadProgress {
  fileId: string;
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  progress: number;
  speed: number; // bytes per second
  timeRemaining: number; // seconds
  status: "pending" | "uploading" | "completed" | "error" | "paused";
  error?: string;
  startTime: number;
  lastUpdate: number;
}

export interface UploadFile {
  file: File;
  fileId: string;
  path: string;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number;
  currentChunk: number;
  retryCount: number;
  maxRetries: number;
}

export class UploadManager {
  private uploads: Map<string, UploadFile> = new Map();
  private progress: Map<string, UploadProgress> = new Map();
  private listeners: Map<string, (progress: UploadProgress) => void> =
    new Map();
  private globalListener?: (allProgress: UploadProgress[]) => void;
  private conflictHandler?: (
    fileName: string,
    onReplace: () => void,
    onCancel: () => void
  ) => void;
  private concurrentUploads = 6; // Match backend default
  private activeUploads = new Set<string>();
  private queue: string[] = [];
  private chunkSize = 8 * 1024 * 1024; // Match backend default 8MB chunks
  private optimalConfig: {
    chunkSize: number;
    maxConcurrentUploads: number;
    bufferSize: number;
    tusEndpoint: string;
    supportsResumable: boolean;
    extensions: string[];
  } | null = null;
  private testMode = false; // Set to true for testing without server calls
  private replaceFlags: Map<string, boolean> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private pendingConflicts = new Set<string>();

  constructor() {
    // Load optimal configuration on initialization
    this.loadOptimalConfig().catch(console.warn);
  }

  // Load hardware-optimized upload configuration from server
  private async loadOptimalConfig(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tus/config`);
      if (response.ok) {
        this.optimalConfig = await response.json();
        // Apply optimal settings
        if (this.optimalConfig?.chunkSize) {
          this.chunkSize = this.optimalConfig.chunkSize;
        }
        if (this.optimalConfig?.maxConcurrentUploads) {
          this.concurrentUploads = this.optimalConfig.maxConcurrentUploads;
        }
        console.log("Loaded optimal upload config:", this.optimalConfig);
      }
    } catch (error) {
      console.warn("Failed to load optimal config:", error);
    }
  }

  public async addFiles(
    files: FileList | File[],
    targetPath: string
  ): Promise<string[]> {
    const fileIds: string[] = [];

    for (const file of Array.from(files)) {
      const fileId = this.generateFileId(file.name, file.size);
      // Pick chunk size dynamically based on file size
      const chunkSize = this.pickChunkSize(file.size);
      const totalChunks = Math.ceil(file.size / chunkSize);

      // Preserve folder structure if webkitRelativePath is present (folder upload)
      const relPath: string | undefined = (
        file as File & { webkitRelativePath?: string }
      ).webkitRelativePath;
      const subDir =
        relPath && relPath.includes("/")
          ? relPath.slice(0, relPath.lastIndexOf("/"))
          : "";
      const base = targetPath === "/" ? "" : targetPath.replace(/\/$/, "");
      const perFileTargetPath =
        (base + (subDir ? "/" + subDir : "")).replace(/\/+/g, "/") || "/";

      // Deduplicate: if an upload with same name+size to same path is already being tracked, skip adding a duplicate
      const existing = Array.from(this.uploads.entries()).find(
        ([, u]) =>
          u.path === perFileTargetPath &&
          u.file.name === file.name &&
          u.file.size === file.size
      );
      if (existing) {
        fileIds.push(existing[0]);
        continue;
      }

      // Check for existing upload to resume
      let resumeData = { canResume: false, uploadedChunks: [] as number[] };
      let hasConflict = false;
      try {
        resumeData = await this.checkResumeData(
          fileId,
          file.name,
          perFileTargetPath,
          chunkSize,
          totalChunks
        );
      } catch (error) {
        if (error instanceof Error && error.message === "file exists") {
          hasConflict = true;
        }
      }
      const currentChunk = resumeData.canResume
        ? resumeData.uploadedChunks.length
        : 0;

      const uploadFile: UploadFile = {
        file,
        fileId,
        path: perFileTargetPath,
        chunkSize,
        totalChunks,
        uploadedChunks: currentChunk,
        currentChunk,
        retryCount: 0,
        maxRetries: 3,
      };

      const progress: UploadProgress = {
        fileId,
        fileName: file.name,
        fileSize: file.size,
        uploadedBytes: currentChunk * chunkSize,
        progress: (currentChunk / totalChunks) * 100,
        speed: 0,
        timeRemaining: 0,
        status: currentChunk >= totalChunks ? "completed" : "pending",
        startTime: Date.now(),
        lastUpdate: Date.now(),
      };

      this.uploads.set(fileId, uploadFile);
      this.progress.set(fileId, progress);

      if (hasConflict && this.conflictHandler) {
        // Handle conflict with dialog
        this.pendingConflicts.add(fileId);
        progress.status = "paused";
        this.notifyProgress(fileId);

        this.conflictHandler(
          file.name,
          () => {
            // User chose to replace
            this.replaceFlags.set(fileId, true);
            this.pendingConflicts.delete(fileId);
            progress.status = "pending";
            progress.error = undefined;
            this.queue.push(fileId);
            this.notifyProgress(fileId);
            this.processQueue();
          },
          () => {
            // User chose to cancel
            this.pendingConflicts.delete(fileId);
            this.cancelUpload(fileId);
          }
        );
      } else if (hasConflict) {
        // Fallback to old behavior if no conflict handler
        progress.status = "error";
        progress.error = "file exists";
        this.notifyProgress(fileId);
      } else if (progress.status !== "completed") {
        this.queue.push(fileId);
      }

      fileIds.push(fileId);
    }

    this.processQueue();
    return fileIds;
  }

  private pickChunkSize(fileSize: number): number {
    // Use server-provided optimal chunk size if available
    if (this.optimalConfig?.chunkSize) {
      return this.optimalConfig.chunkSize;
    }
    
    // Fallback heuristic: larger files get larger chunks to reduce overhead
    if (fileSize >= 2 * 1024 * 1024 * 1024) {
      // >= 2GB
      return 32 * 1024 * 1024; // 32MB
    }
    if (fileSize >= 512 * 1024 * 1024) {
      // >= 512MB  
      return 24 * 1024 * 1024; // 24MB
    }
    return this.chunkSize; // default based on hardware detection
  }

  private async checkResumeData(
    fileId: string,
    fileName: string,
    pathParam: string,
    chunkSize: number,
    totalChunks: number
  ) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fs/upload-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Provide chunk hints so backend can compute resume from .part size
        body: JSON.stringify({
          fileId,
          fileName,
          pathParam,
          chunkSize,
          totalChunks,
        }),
      });

      if (response.ok) {
        const responseText = await response.text();

        if (responseText.includes("<html>")) {
          console.warn("Server returned HTML for upload status check");
          return { canResume: false, uploadedChunks: [] };
        }

        try {
          return JSON.parse(responseText);
        } catch (jsonError) {
          console.warn("JSON parse error in checkResumeData:", jsonError);
          return { canResume: false, uploadedChunks: [] };
        }
      } else if (response.status === 409) {
        // File exists - trigger conflict handling in upload manager
        throw new Error("file exists");
      }
    } catch (error) {
      // Propagate conflict so caller can show modal; swallow other errors
      if (error instanceof Error && error.message === "file exists") {
        throw error;
      }
      console.warn("Failed to check resume data:", error);
    }

    return { canResume: false, uploadedChunks: [] };
  }

  public onProgress(
    fileId: string,
    callback: (progress: UploadProgress) => void
  ): void {
    this.listeners.set(fileId, callback);
  }

  public onGlobalProgress(
    callback: (allProgress: UploadProgress[]) => void
  ): void {
    this.globalListener = callback;
  }

  public onConflict(
    callback: (
      fileName: string,
      onReplace: () => void,
      onCancel: () => void
    ) => void
  ): void {
    this.conflictHandler = callback;
  }

  public pauseUpload(fileId: string): void {
    const progress = this.progress.get(fileId);
    if (
      progress &&
      (progress.status === "uploading" || progress.status === "pending")
    ) {
      progress.status = "paused";
      this.activeUploads.delete(fileId);
      // Remove from queue if it's pending
      this.queue = this.queue.filter((id) => id !== fileId);
      this.notifyProgress(fileId);
      this.processQueue();
    }
  }

  public resumeUpload(fileId: string): void {
    const progress = this.progress.get(fileId);
    if (progress && progress.status === "paused") {
      progress.status = "pending";
      if (!this.queue.includes(fileId)) {
        this.queue.unshift(fileId); // Add to front of queue
      }
      this.notifyProgress(fileId);
      this.processQueue();
    }
  }

  public cancelUpload(fileId: string): void {
    // Abort any in-flight request
    const controller = this.abortControllers.get(fileId);
    if (controller) {
      try {
        controller.abort();
      } catch {}
      this.abortControllers.delete(fileId);
    }

    // Notify backend to cancel and cleanup partial chunks (best-effort)
    const uploadFile = this.uploads.get(fileId);
    if (uploadFile) {
      fetch(`${API_BASE_URL}/api/fs/upload-cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          fileName: uploadFile.file.name,
          path: uploadFile.path,
        }),
      }).catch(() => {
        /* ignore */
      });
    }

    // Clean up all references
    this.uploads.delete(fileId);
    this.progress.delete(fileId);
    this.listeners.delete(fileId);
    this.replaceFlags.delete(fileId);
    this.activeUploads.delete(fileId);
    this.queue = this.queue.filter((id) => id !== fileId);

    // Notify about global progress change (this will remove the item from UI)
    if (this.globalListener) {
      this.globalListener(this.getAllProgress());
    }

    this.processQueue();
  }

  public getProgress(fileId: string): UploadProgress | undefined {
    return this.progress.get(fileId);
  }

  public getAllProgress(): UploadProgress[] {
    return Array.from(this.progress.values());
  }

  public setTestMode(enabled: boolean): void {
    this.testMode = enabled;
  }

  private generateFileId(fileName: string, fileSize: number): string {
    // Generate a more stable ID based on file properties for resumable uploads
    const fileHash = btoa(fileName + fileSize + Date.now()).replace(
      /[/+=]/g,
      ""
    );
    return `upload_${fileHash}`;
  }

  private async processQueue(): Promise<void> {
    while (
      this.queue.length > 0 &&
      this.activeUploads.size < this.concurrentUploads
    ) {
      const fileId = this.queue.shift()!;
      const uploadFile = this.uploads.get(fileId);
      const progress = this.progress.get(fileId);

      if (!uploadFile || !progress) {
        continue;
      }

      if (progress.status === "completed" || progress.status === "paused") {
        continue;
      }

      this.activeUploads.add(fileId);
      progress.status = "uploading";
      this.notifyProgress(fileId);

      this.uploadFile(fileId).catch(() => {
        // Error handling is done in uploadFile method
      });
    }
  }

  private async uploadFile(fileId: string): Promise<void> {
    const uploadFile = this.uploads.get(fileId);
    const progress = this.progress.get(fileId);

    if (!uploadFile || !progress) return;

    try {
      while (uploadFile.currentChunk < uploadFile.totalChunks) {
        // Check if upload was paused or cancelled
        if (progress.status === "paused" || !this.uploads.has(fileId)) {
          break;
        }

        const success = await this.uploadChunk(uploadFile);
        if (!success) {
          if (uploadFile.retryCount >= uploadFile.maxRetries) {
            progress.status = "error";
            progress.error = "Max retries exceeded";
            this.notifyProgress(fileId);
            this.activeUploads.delete(fileId);
            this.processQueue();
            return;
          }
          uploadFile.retryCount++;
          await this.delay(1000 * uploadFile.retryCount); // Exponential backoff
          continue;
        }

        uploadFile.currentChunk++;
        uploadFile.retryCount = 0;
        this.updateProgress(fileId);
      }

      if (uploadFile.currentChunk >= uploadFile.totalChunks) {
        progress.status = "completed";
        progress.progress = 100;
        this.notifyProgress(fileId);
      }
    } catch (error) {
      progress.status = "error";
      progress.error = error instanceof Error ? error.message : "Upload failed";
      this.notifyProgress(fileId);
    } finally {
      this.activeUploads.delete(fileId);
      this.processQueue();
    }
  }

  private async uploadChunk(uploadFile: UploadFile): Promise<boolean> {
    // Test mode - simulate upload with delay
    if (this.testMode) {
      await this.delay(200); // Simulate network delay
      return Math.random() > 0.1; // 90% success rate for testing
    }

    const { file, fileId, path, chunkSize, currentChunk } = uploadFile;
    const start = currentChunk * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append("path", path);
    formData.append("fileName", file.name);
    formData.append("fileId", fileId);
    formData.append("chunkIndex", currentChunk.toString());
    formData.append("totalChunks", uploadFile.totalChunks.toString());
    formData.append("chunkSize", uploadFile.chunkSize.toString());
    formData.append("totalSize", uploadFile.file.size.toString());
    formData.append("chunk", chunk);
    // If client requested replace for this file, include that flag so backend will overwrite
    if (this.replaceFlags.get(fileId)) {
      formData.append("replace", "true");
    }

    // Use AbortController so we can cancel in-flight chunk uploads
    const controller = new AbortController();
    this.abortControllers.set(fileId, controller);

    try {
      const response = await fetch(`${API_BASE_URL}/api/fs/upload-chunk`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        // If conflict, show conflict dialog via handler and pause this upload
        if (response.status === 409) {
          const progress = this.progress.get(fileId);
          const upload = this.uploads.get(fileId);
          if (progress && upload) {
            // Avoid duplicate dialogs
            if (!this.pendingConflicts.has(fileId)) {
              this.pendingConflicts.add(fileId);
              progress.status = "paused";
              this.notifyProgress(fileId);
              if (this.conflictHandler) {
                this.conflictHandler(
                  upload.file.name,
                  () => {
                    // replace
                    this.replaceFlags.set(fileId, true);
                    this.pendingConflicts.delete(fileId);
                    progress.status = "pending";
                    progress.error = undefined;
                    if (!this.queue.includes(fileId))
                      this.queue.unshift(fileId);
                    this.notifyProgress(fileId);
                    this.processQueue();
                  },
                  () => {
                    // cancel
                    this.pendingConflicts.delete(fileId);
                    this.cancelUpload(fileId);
                  }
                );
              } else {
                // Fallback to inline error
                progress.status = "error";
                progress.error = "file exists";
                this.notifyProgress(fileId);
              }
            }
          }
          return false;
        }

        const errorText = await response.text();
        // Check if response is HTML (error page)
        if (errorText.includes("<html>")) {
          throw new Error(
            `Server error: ${response.status} ${response.statusText}`
          );
        }

        // Try to parse as JSON for API errors
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || `HTTP ${response.status}`);
        } catch {
          throw new Error(
            `HTTP ${response.status}: ${errorText.substring(0, 100)}`
          );
        }
      }

      const responseText = await response.text();

      // Validate JSON response
      if (!responseText || responseText.trim() === "") {
        throw new Error("Empty response from server");
      }

      // Check if response is HTML instead of JSON
      if (responseText.includes("<html>")) {
        throw new Error(
          "Server returned HTML instead of JSON - possible server error"
        );
      }

      try {
        const result = JSON.parse(responseText);
        return result.ok;
      } catch (jsonError) {
        console.error(
          "JSON parse error:",
          jsonError,
          "Response:",
          responseText.substring(0, 200)
        );
        throw new Error("Invalid JSON response from server");
      }
    } catch (error) {
      const errName = (error as Error & { name?: string }).name;
      if (errName === "AbortError") {
        // Request was aborted due to cancel - treat as cancelled
        console.warn(`Chunk upload aborted for ${fileId}:${currentChunk}`);
        return false;
      }
      console.error(`Chunk upload failed for ${fileId}:${currentChunk}`, error);
      return false;
    } finally {
      // Clear abort controller for this file (no in-flight request now)
      const c = this.abortControllers.get(fileId);
      if (c === controller) this.abortControllers.delete(fileId);
    }
  }

  // Retry upload but set replace flag so backend will overwrite existing file
  public retryWithReplace(fileId: string): void {
    const uploadFile = this.uploads.get(fileId);
    const progress = this.progress.get(fileId);
    if (!uploadFile || !progress) return;

    this.replaceFlags.set(fileId, true);
    // mark pending and requeue
    progress.status = "pending";
    progress.error = undefined;
    if (!this.queue.includes(fileId)) this.queue.unshift(fileId);
    this.notifyProgress(fileId);
    this.processQueue();
  }

  private updateProgress(fileId: string): void {
    const uploadFile = this.uploads.get(fileId);
    const progressData = this.progress.get(fileId);

    if (!uploadFile || !progressData) return;

    const now = Date.now();
    const uploadedBytes = uploadFile.currentChunk * uploadFile.chunkSize;
    const progressPercent =
      (uploadFile.currentChunk / uploadFile.totalChunks) * 100;

    // Calculate speed (bytes per second)
    const timeDiff = (now - progressData.lastUpdate) / 1000;
    const bytesDiff = uploadedBytes - progressData.uploadedBytes;
    const currentSpeed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

    // Smooth speed calculation using weighted average
    progressData.speed = progressData.speed * 0.7 + currentSpeed * 0.3;

    // Calculate time remaining
    const remainingBytes = uploadFile.file.size - uploadedBytes;
    progressData.timeRemaining =
      progressData.speed > 0 ? remainingBytes / progressData.speed : 0;

    progressData.uploadedBytes = uploadedBytes;
    progressData.progress = Math.min(progressPercent, 100);
    progressData.lastUpdate = now;

    this.notifyProgress(fileId);
  }

  private notifyProgress(fileId: string): void {
    const progressData = this.progress.get(fileId);
    if (!progressData) return;

    const listener = this.listeners.get(fileId);
    if (listener) {
      listener(progressData);
    }

    if (this.globalListener) {
      this.globalListener(this.getAllProgress());
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  public formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return "--:--";

    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}:${minutes.toString().padStart(2, "0")}:00`;
    }
  }
}

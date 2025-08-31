// TUS 1.0.0 Compliant Upload Manager  
// Use empty string for relative URLs since nginx will proxy to Go backend
const API_BASE_URL = "";

export interface TusUploadProgress {
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
  uploadUrl?: string; // TUS upload URL
}

export interface TusUploadFile {
  file: File;
  fileId: string;
  path: string;
  uploadUrl: string | null;
  offset: number;
  retryCount: number;
  maxRetries: number;
  chunkSize: number;
}

export class TusUploadManager {
  private uploads: Map<string, TusUploadFile> = new Map();
  private progress: Map<string, TusUploadProgress> = new Map();
  private listeners: Map<string, (progress: TusUploadProgress) => void> = new Map();
  private globalListener?: (allProgress: TusUploadProgress[]) => void;
  private conflictHandler?: (
    fileName: string,
    onReplace: () => void,
    onCancel: () => void
  ) => void;
  private concurrentUploads = 6;
  private activeUploads = new Set<string>();
  private queue: string[] = [];
  private chunkSize = 8 * 1024 * 1024; // 8MB default
  private abortControllers: Map<string, AbortController> = new Map();
  private tusConfig: {
    version?: string;
    maxSize?: number;
    extensions?: string[];
    chunkSize?: number;
    maxConcurrentUploads?: number;
    resumable?: boolean;
  } | null = null;

  constructor() {
    this.loadTusConfig().catch(console.warn);
  }

  // Load TUS configuration from server
  private async loadTusConfig(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tus/config`);
      if (response.ok) {
        this.tusConfig = await response.json();
        if (this.tusConfig?.chunkSize) {
          this.chunkSize = this.tusConfig.chunkSize;
        }
        if (this.tusConfig?.maxConcurrentUploads) {
          this.concurrentUploads = this.tusConfig.maxConcurrentUploads;
        }
        console.log("Loaded TUS config:", this.tusConfig);
      }
    } catch (error) {
      console.warn("Failed to load TUS config:", error);
    }
  }

  public async addFiles(
    files: FileList | File[],
    targetPath: string
  ): Promise<string[]> {
    const fileIds: string[] = [];

    for (const file of Array.from(files)) {
      const fileId = this.generateFileId(file.name, file.size);
      
      // Preserve folder structure if webkitRelativePath is present
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

      const uploadFile: TusUploadFile = {
        file,
        fileId,
        path: perFileTargetPath,
        uploadUrl: null,
        offset: 0,
        retryCount: 0,
        maxRetries: 3,
        chunkSize: this.chunkSize,
      };

      const progress: TusUploadProgress = {
        fileId,
        fileName: file.name,
        fileSize: file.size,
        uploadedBytes: 0,
        progress: 0,
        speed: 0,
        timeRemaining: 0,
        status: "pending",
        startTime: Date.now(),
        lastUpdate: Date.now(),
      };

      this.uploads.set(fileId, uploadFile);
      this.progress.set(fileId, progress);
      this.queue.push(fileId);
      fileIds.push(fileId);
    }

    this.processQueue();
    return fileIds;
  }

  private async processQueue(): Promise<void> {
    while (
      this.queue.length > 0 &&
      this.activeUploads.size < this.concurrentUploads
    ) {
      const fileId = this.queue.shift()!;
      const uploadFile = this.uploads.get(fileId);
      const progress = this.progress.get(fileId);

      if (!uploadFile || !progress) continue;
      if (progress.status === "completed" || progress.status === "paused") continue;

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
      // Create upload if not exists
      if (!uploadFile.uploadUrl) {
        const created = await this.createTusUpload(uploadFile);
        if (!created) {
          throw new Error("Failed to create TUS upload");
        }
      }

      // Resume upload from current offset
      while (uploadFile.offset < uploadFile.file.size) {
        // Check if upload was paused or cancelled
        if (progress.status === "paused" || !this.uploads.has(fileId)) {
          break;
        }

        // Get current offset from server
        const serverOffset = await this.getServerOffset(uploadFile);
        if (serverOffset !== uploadFile.offset) {
          uploadFile.offset = serverOffset;
          this.updateProgress(fileId);
        }

        // Upload next chunk
        const success = await this.uploadChunk(uploadFile);
        if (!success) {
          if (uploadFile.retryCount >= uploadFile.maxRetries) {
            throw new Error("Max retries exceeded");
          }
          uploadFile.retryCount++;
          await this.delay(1000 * uploadFile.retryCount);
          continue;
        }

        uploadFile.retryCount = 0;
        this.updateProgress(fileId);
      }

      if (uploadFile.offset >= uploadFile.file.size) {
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

  // Create TUS upload via POST request
  private async createTusUpload(uploadFile: TusUploadFile): Promise<boolean> {
    try {
      const controller = new AbortController();
      this.abortControllers.set(uploadFile.fileId, controller);

      // Encode metadata as base64 (Unicode-safe)
      const filenameEncoded = this.safeBase64Encode(uploadFile.file.name);
      const pathEncoded = this.safeBase64Encode(uploadFile.path);
      const metadata = `filename ${filenameEncoded},path ${pathEncoded}`;

      const response = await fetch(`${API_BASE_URL}/api/tus/files`, {
        method: "POST",
        headers: {
          "Tus-Resumable": "1.0.0",
          "Upload-Length": uploadFile.file.size.toString(),
          "Upload-Metadata": metadata,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Create upload failed: ${response.status}`);
      }

      // Get upload URL from Location header
      const location = response.headers.get("Location");
      if (!location) {
        throw new Error("No Location header in create response");
      }

      uploadFile.uploadUrl = `${API_BASE_URL}${location}`;
      return true;
    } catch (error) {
      console.error("Failed to create TUS upload:", error);
      return false;
    }
  }

  // Get current offset from server via HEAD request
  private async getServerOffset(uploadFile: TusUploadFile): Promise<number> {
    if (!uploadFile.uploadUrl) return 0;

    try {
      const controller = new AbortController();
      this.abortControllers.set(uploadFile.fileId, controller);

      const response = await fetch(uploadFile.uploadUrl, {
        method: "HEAD",
        headers: {
          "Tus-Resumable": "1.0.0",
        },
        signal: controller.signal,
      });

      if (!response.ok) return uploadFile.offset;

      const offsetHeader = response.headers.get("Upload-Offset");
      return offsetHeader ? parseInt(offsetHeader, 10) : 0;
    } catch (error) {
      console.warn("Failed to get server offset:", error);
      return uploadFile.offset;
    }
  }

  // Upload chunk via PATCH request
  private async uploadChunk(uploadFile: TusUploadFile): Promise<boolean> {
    if (!uploadFile.uploadUrl) return false;

    const { file, offset, chunkSize } = uploadFile;
    const start = offset;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const controller = new AbortController();
    this.abortControllers.set(uploadFile.fileId, controller);

    try {
      const response = await fetch(uploadFile.uploadUrl, {
        method: "PATCH",
        headers: {
          "Tus-Resumable": "1.0.0",
          "Content-Type": "application/offset+octet-stream",
          "Upload-Offset": offset.toString(),
        },
        body: chunk,
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 409) {
          // Offset conflict - sync with server
          const serverOffset = await this.getServerOffset(uploadFile);
          uploadFile.offset = serverOffset;
          return false; // Retry
        }
        throw new Error(`Upload chunk failed: ${response.status}`);
      }

      // Update offset from response
      const newOffsetHeader = response.headers.get("Upload-Offset");
      if (newOffsetHeader) {
        uploadFile.offset = parseInt(newOffsetHeader, 10);
      } else {
        uploadFile.offset = end;
      }

      return true;
    } catch (error) {
      const errName = (error as Error & { name?: string }).name;
      if (errName === "AbortError") {
        console.warn(`Chunk upload aborted for ${uploadFile.fileId}`);
        return false;
      }
      console.error(`Chunk upload failed for ${uploadFile.fileId}:`, error);
      return false;
    } finally {
      const c = this.abortControllers.get(uploadFile.fileId);
      if (c === controller) this.abortControllers.delete(uploadFile.fileId);
    }
  }

  public pauseUpload(fileId: string): void {
    const progress = this.progress.get(fileId);
    if (progress && (progress.status === "uploading" || progress.status === "pending")) {
      progress.status = "paused";
      this.activeUploads.delete(fileId);
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
        this.queue.unshift(fileId);
      }
      this.notifyProgress(fileId);
      this.processQueue();
    }
  }

  // Retry upload but set replace flag so backend will overwrite existing file
  public retryWithReplace(fileId: string): void {
    const uploadFile = this.uploads.get(fileId);
    const progress = this.progress.get(fileId);
    if (!uploadFile || !progress) return;

    // Reset upload state and retry
    uploadFile.uploadUrl = null;
    uploadFile.offset = 0;
    uploadFile.retryCount = 0;
    
    progress.status = "pending";
    progress.error = undefined;
    progress.uploadedBytes = 0;
    progress.progress = 0;
    
    if (!this.queue.includes(fileId)) {
      this.queue.unshift(fileId);
    }
    
    this.notifyProgress(fileId);
    this.processQueue();
  }

  public async cancelUpload(fileId: string): Promise<void> {
    // Abort any in-flight request
    const controller = this.abortControllers.get(fileId);
    if (controller) {
      try {
        controller.abort();
      } catch {}
      this.abortControllers.delete(fileId);
    }

    // Delete upload on server
    const uploadFile = this.uploads.get(fileId);
    if (uploadFile?.uploadUrl) {
      try {
        await fetch(uploadFile.uploadUrl, {
          method: "DELETE",
          headers: {
            "Tus-Resumable": "1.0.0",
          },
        });
      } catch (error) {
        console.warn("Failed to delete upload on server:", error);
      }
    }

    // Clean up local references
    this.uploads.delete(fileId);
    this.progress.delete(fileId);
    this.listeners.delete(fileId);
    this.activeUploads.delete(fileId);
    this.queue = this.queue.filter((id) => id !== fileId);

    if (this.globalListener) {
      this.globalListener(this.getAllProgress());
    }

    this.processQueue();
  }

  // Event handlers
  public onProgress(fileId: string, callback: (progress: TusUploadProgress) => void): void {
    this.listeners.set(fileId, callback);
  }

  public onGlobalProgress(callback: (allProgress: TusUploadProgress[]) => void): void {
    this.globalListener = callback;
  }

  public onConflict(callback: (fileName: string, onReplace: () => void, onCancel: () => void) => void): void {
    this.conflictHandler = callback;
  }

  public getProgress(fileId: string): TusUploadProgress | undefined {
    return this.progress.get(fileId);
  }

  public getAllProgress(): TusUploadProgress[] {
    return Array.from(this.progress.values());
  }

  // Helper methods
  private generateFileId(fileName: string, fileSize: number): string {
    const fileHash = this.safeBase64Encode(fileName + fileSize + Date.now()).replace(/[/+=]/g, "");
    return `tus_upload_${fileHash}`;
  }

  // Safe base64 encoding that handles Unicode characters
  private safeBase64Encode(str: string): string {
    try {
      // Use TextEncoder to convert Unicode string to UTF-8 bytes, then encode
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const binaryString = String.fromCharCode(...data);
      return btoa(binaryString);
    } catch (error) {
      // Fallback: use crypto.subtle if available, otherwise generate a random hash
      console.warn("Base64 encoding failed, using fallback:", error);
      return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
  }

  private updateProgress(fileId: string): void {
    const uploadFile = this.uploads.get(fileId);
    const progressData = this.progress.get(fileId);

    if (!uploadFile || !progressData) return;

    const now = Date.now();
    const uploadedBytes = uploadFile.offset;
    const progressPercent = (uploadedBytes / uploadFile.file.size) * 100;

    // Calculate speed
    const timeDiff = (now - progressData.lastUpdate) / 1000;
    const bytesDiff = uploadedBytes - progressData.uploadedBytes;
    const currentSpeed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

    // Smooth speed calculation
    progressData.speed = progressData.speed * 0.7 + currentSpeed * 0.3;

    // Calculate time remaining
    const remainingBytes = uploadFile.file.size - uploadedBytes;
    progressData.timeRemaining = progressData.speed > 0 ? remainingBytes / progressData.speed : 0;

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
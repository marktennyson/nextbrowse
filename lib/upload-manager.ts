export interface UploadProgress {
  fileId: string;
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  progress: number;
  speed: number; // bytes per second
  timeRemaining: number; // seconds
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'paused';
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
  private listeners: Map<string, (progress: UploadProgress) => void> = new Map();
  private globalListener?: (allProgress: UploadProgress[]) => void;
  private concurrentUploads = 3;
  private activeUploads = new Set<string>();
  private queue: string[] = [];
  private chunkSize = 5 * 1024 * 1024; // 5MB chunks for optimal performance
  private testMode = false; // Set to true for testing without server calls

  public async addFiles(files: FileList | File[], targetPath: string): Promise<string[]> {
    const fileIds: string[] = [];
    
    for (const file of Array.from(files)) {
      const fileId = this.generateFileId(file.name, file.size);
      const totalChunks = Math.ceil(file.size / this.chunkSize);
      
      // Check for existing upload to resume
      const resumeData = await this.checkResumeData(fileId, file.name, targetPath);
      const currentChunk = resumeData.canResume ? resumeData.uploadedChunks.length : 0;
      
      const uploadFile: UploadFile = {
        file,
        fileId,
        path: targetPath,
        chunkSize: this.chunkSize,
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
        uploadedBytes: currentChunk * this.chunkSize,
        progress: (currentChunk / totalChunks) * 100,
        speed: 0,
        timeRemaining: 0,
        status: currentChunk >= totalChunks ? 'completed' : 'pending',
        startTime: Date.now(),
        lastUpdate: Date.now(),
      };

      this.uploads.set(fileId, uploadFile);
      this.progress.set(fileId, progress);
      
      if (progress.status !== 'completed') {
        this.queue.push(fileId);
      }
      
      fileIds.push(fileId);
    }

    this.processQueue();
    return fileIds;
  }

  private async checkResumeData(fileId: string, fileName: string, pathParam: string) {
    try {
      const response = await fetch('/api/fs/upload-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, fileName, pathParam }),
      });

      if (response.ok) {
        const responseText = await response.text();
        
        if (responseText.includes('<html>')) {
          console.warn('Server returned HTML for upload status check');
          return { canResume: false, uploadedChunks: [] };
        }
        
        try {
          return JSON.parse(responseText);
        } catch (jsonError) {
          console.warn('JSON parse error in checkResumeData:', jsonError);
          return { canResume: false, uploadedChunks: [] };
        }
      }
    } catch (error) {
      console.warn('Failed to check resume data:', error);
    }

    return { canResume: false, uploadedChunks: [] };
  }

  public onProgress(fileId: string, callback: (progress: UploadProgress) => void): void {
    this.listeners.set(fileId, callback);
  }

  public onGlobalProgress(callback: (allProgress: UploadProgress[]) => void): void {
    this.globalListener = callback;
  }

  public pauseUpload(fileId: string): void {
    const progress = this.progress.get(fileId);
    if (progress && (progress.status === 'uploading' || progress.status === 'pending')) {
      progress.status = 'paused';
      this.activeUploads.delete(fileId);
      // Remove from queue if it's pending
      this.queue = this.queue.filter(id => id !== fileId);
      this.notifyProgress(fileId);
      this.processQueue();
    }
  }

  public resumeUpload(fileId: string): void {
    const progress = this.progress.get(fileId);
    if (progress && progress.status === 'paused') {
      progress.status = 'pending';
      if (!this.queue.includes(fileId)) {
        this.queue.unshift(fileId); // Add to front of queue
      }
      this.notifyProgress(fileId);
      this.processQueue();
    }
  }

  public cancelUpload(fileId: string): void {
    // Clean up all references
    this.uploads.delete(fileId);
    this.progress.delete(fileId);
    this.listeners.delete(fileId);
    this.activeUploads.delete(fileId);
    this.queue = this.queue.filter(id => id !== fileId);
    
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
    const fileHash = btoa(fileName + fileSize + Date.now()).replace(/[/+=]/g, '');
    return `upload_${fileHash}`;
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.activeUploads.size < this.concurrentUploads) {
      const fileId = this.queue.shift()!;
      const uploadFile = this.uploads.get(fileId);
      const progress = this.progress.get(fileId);

      if (!uploadFile || !progress) {
        continue;
      }
      
      if (progress.status === 'completed' || progress.status === 'paused') {
        continue;
      }

      this.activeUploads.add(fileId);
      progress.status = 'uploading';
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
        if (progress.status === 'paused' || !this.uploads.has(fileId)) {
          break;
        }

        const success = await this.uploadChunk(uploadFile);
        if (!success) {
          if (uploadFile.retryCount >= uploadFile.maxRetries) {
            progress.status = 'error';
            progress.error = 'Max retries exceeded';
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
        progress.status = 'completed';
        progress.progress = 100;
        this.notifyProgress(fileId);
      }
    } catch (error) {
      progress.status = 'error';
      progress.error = error instanceof Error ? error.message : 'Upload failed';
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
    formData.append('path', path);
    formData.append('fileName', file.name);
    formData.append('fileId', fileId);
    formData.append('chunkIndex', currentChunk.toString());
    formData.append('totalChunks', uploadFile.totalChunks.toString());
    formData.append('chunk', chunk);

    try {
      const response = await fetch('/api/fs/upload-chunk', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Check if response is HTML (error page)
        if (errorText.includes('<html>')) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        // Try to parse as JSON for API errors
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || `HTTP ${response.status}`);
        } catch {
          throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }
      }

      const responseText = await response.text();
      
      // Validate JSON response
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from server');
      }
      
      // Check if response is HTML instead of JSON
      if (responseText.includes('<html>')) {
        throw new Error('Server returned HTML instead of JSON - possible server error');
      }
      
      try {
        const result = JSON.parse(responseText);
        return result.ok;
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError, 'Response:', responseText.substring(0, 200));
        throw new Error('Invalid JSON response from server');
      }
    } catch (error) {
      console.error(`Chunk upload failed for ${fileId}:${currentChunk}`, error);
      return false;
    }
  }

  private updateProgress(fileId: string): void {
    const uploadFile = this.uploads.get(fileId);
    const progressData = this.progress.get(fileId);

    if (!uploadFile || !progressData) return;

    const now = Date.now();
    const uploadedBytes = uploadFile.currentChunk * uploadFile.chunkSize;
    const progressPercent = (uploadFile.currentChunk / uploadFile.totalChunks) * 100;
    
    // Calculate speed (bytes per second)
    const timeDiff = (now - progressData.lastUpdate) / 1000;
    const bytesDiff = uploadedBytes - progressData.uploadedBytes;
    const currentSpeed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
    
    // Smooth speed calculation using weighted average
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
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  public formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '--:--';
    
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}:${minutes.toString().padStart(2, '0')}:00`;
    }
  }
}
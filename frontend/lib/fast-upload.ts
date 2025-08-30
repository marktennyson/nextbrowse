// High-performance upload utilities inspired by FileBrowser

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onFileProgress?: (fileName: string, progress: UploadProgress) => void;
}

interface QueuedUpload {
  file: File;
  path: string;
  options: UploadOptions;
}

interface FastUploadConfig {
  maxConcurrentUploads?: number;
  chunkSize?: number;
  maxChunkSize?: number;
}

export class FastUploadManager {
  private maxConcurrentUploads = 5;
  private chunkSize = 10 * 1024 * 1024; // 10MB chunks
  private maxChunkSize = 50 * 1024 * 1024; // 50MB for fast connections
  private activeUploads = new Map();
  private uploadQueue: QueuedUpload[] = [];

  constructor(options: FastUploadConfig = {}) {
    if (options.maxConcurrentUploads)
      this.maxConcurrentUploads = options.maxConcurrentUploads;
    if (options.chunkSize) this.chunkSize = options.chunkSize;
    if (options.maxChunkSize) this.maxChunkSize = options.maxChunkSize;
  }

  // Detect optimal chunk size based on connection speed
  private async detectOptimalChunkSize(): Promise<number> {
    // Start with smaller chunk, measure speed, adjust
    const testStart = performance.now();
    const testChunk = new ArrayBuffer(1024 * 1024); // 1MB test

    try {
      // Simulate upload to measure network speed
      await fetch("/api/fast/test-speed", {
        method: "POST",
        body: testChunk,
        headers: { "Content-Type": "application/octet-stream" },
      });

      const duration = performance.now() - testStart;
      const speed = (1024 * 1024) / (duration / 1000); // bytes per second

      // Adjust chunk size based on speed
      if (speed > 50 * 1024 * 1024) {
        // > 50 MB/s
        return this.maxChunkSize;
      } else if (speed > 10 * 1024 * 1024) {
        // > 10 MB/s
        return 20 * 1024 * 1024;
      } else {
        return this.chunkSize;
      }
    } catch {
      return this.chunkSize; // fallback
    }
  }

  // TUS resumable upload implementation
  async uploadWithTUS(
    file: File,
    path: string,
    options: UploadOptions = {}
  ): Promise<void> {
    const fileName = file.name;
    const fileSize = file.size;

    // 1. Initialize upload session
    const initResponse = await fetch(
      `/api/tus/upload?path=${encodeURIComponent(path)}`,
      {
        method: "POST",
        headers: {
          "Upload-Length": fileSize.toString(),
          "Upload-Metadata": fileName,
        },
      }
    );

    if (!initResponse.ok) {
      throw new Error("Failed to initialize upload");
    }

    const uploadUrl = initResponse.headers.get("Location");
    if (!uploadUrl) {
      throw new Error("No upload URL returned");
    }

    // 2. Upload in chunks with resume capability
    let offset = 0;
    const optimalChunkSize = await this.detectOptimalChunkSize();

    while (offset < fileSize) {
      const chunk = file.slice(offset, offset + optimalChunkSize);

      const patchResponse = await fetch(uploadUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/offset+octet-stream",
          "Upload-Offset": offset.toString(),
        },
        body: chunk,
      });

      if (!patchResponse.ok) {
        // Try to resume from server's last known offset
        const headResponse = await fetch(uploadUrl, { method: "HEAD" });
        const serverOffset = parseInt(
          headResponse.headers.get("Upload-Offset") || "0"
        );
        offset = serverOffset;
        continue;
      }

      offset += chunk.size;

      // Emit progress event
      if (options.onProgress) {
        options.onProgress({
          loaded: offset,
          total: fileSize,
          percentage: (offset / fileSize) * 100,
        });
      }
    }
  }

  // High-speed streaming upload
  async uploadWithStreaming(
    file: File,
    path: string,
    options: UploadOptions = {}
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (options.onProgress && event.lengthComputable) {
          options.onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: (event.loaded / event.total) * 100,
          });
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error("Upload failed"));

      xhr.open("PUT", `/api/fast/stream?path=${encodeURIComponent(path)}`);
      xhr.setRequestHeader("X-File-Name", file.name);
      xhr.setRequestHeader("X-File-Size", file.size.toString());

      xhr.send(file); // Send file directly for streaming
    });
  }

  // Auto-select best upload method based on file size and connection
  async smartUpload(file: File, path: string, options: UploadOptions = {}) {
    const fileSize = file.size;

    if (fileSize > 100 * 1024 * 1024) {
      // > 100MB, use TUS for resumability
      return this.uploadWithTUS(file, path, options);
    } else {
      return this.uploadWithStreaming(file, path, options);
    }
  }

  // Batch upload with optimal concurrency
  async uploadBatch(
    files: File[],
    basePath: string,
    options: UploadOptions = {}
  ) {
    const results: Promise<unknown>[] = [];
    const executing: Promise<unknown>[] = [];

    for (const file of files) {
      const promise = this.smartUpload(file, basePath, {
        ...options,
        onProgress: (progress: UploadProgress) => {
          if (options.onFileProgress) {
            options.onFileProgress(file.name, progress);
          }
        },
      });

      results.push(promise);

      if (results.length >= this.maxConcurrentUploads) {
        executing.push(promise);
      }

      if (executing.length >= this.maxConcurrentUploads) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex((p) => p === promise),
          1
        );
      }
    }

    return Promise.all(results);
  }
}

// Usage example:
const uploadManager = new FastUploadManager({
  maxConcurrentUploads: 8, // Increase for fast connections
  chunkSize: 20 * 1024 * 1024, // 20MB chunks
});

export default uploadManager;

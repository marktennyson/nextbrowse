// API client configuration for Go backend
// In Docker setup, API calls go through nginx proxy, so we use relative URLs
const API_BASE_URL = process.env.NEXT_PUBLIC_GO_API_URL || "";

// Enhanced error handling
class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Request configuration
interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// Default configuration
const DEFAULT_CONFIG: RequestConfig = {
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
};

// Enhanced fetch with timeout and retry
async function enhancedFetch(
  url: string, 
  options: RequestInit = {}, 
  config: RequestConfig = DEFAULT_CONFIG
): Promise<Response> {
  const { timeout = DEFAULT_CONFIG.timeout!, retries = DEFAULT_CONFIG.retries!, retryDelay = DEFAULT_CONFIG.retryDelay! } = config;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // If successful or client error (don't retry client errors)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // Server error - retry
      if (attempt < retries) {
        await delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
        continue;
      }

      throw new APIError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        'HTTP_ERROR'
      );
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        if (attempt < retries) {
          await delay(retryDelay * Math.pow(2, attempt));
          continue;
        }
        throw new APIError('Request timeout', 0, 'TIMEOUT');
      }

      if (attempt < retries) {
        await delay(retryDelay * Math.pow(2, attempt));
        continue;
      }

      throw new APIError(
        error instanceof Error ? error.message : 'Unknown error',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  throw new APIError('Max retries exceeded', 0, 'MAX_RETRIES');
}

// Helper function for delays
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Enhanced response handler
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorDetails: any = undefined;

    try {
      const errorBody = await response.json();
      if (errorBody.error) {
        errorMessage = errorBody.error;
      }
      if (errorBody.message) {
        errorMessage = errorBody.message;
      }
      errorDetails = errorBody;
    } catch {
      // If parsing JSON fails, use default error message
    }

    throw new APIError(errorMessage, response.status, 'API_ERROR', errorDetails);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new APIError('Invalid JSON response', response.status, 'PARSE_ERROR');
  }
}

export { APIError };

export const apiClient = {
  // File listing
  async listDirectory(
    path: string,
    pagination?: {
      page?: number;
      pageSize?: number;
      offset?: number;
      limit?: number;
    }
  ) {
    const params = new URLSearchParams({ path });

    if (pagination) {
      if (pagination.page !== undefined)
        params.set("page", pagination.page.toString());
      if (pagination.pageSize !== undefined)
        params.set("pageSize", pagination.pageSize.toString());
      if (pagination.offset !== undefined)
        params.set("offset", pagination.offset.toString());
      if (pagination.limit !== undefined)
        params.set("limit", pagination.limit.toString());
    }

    const response = await enhancedFetch(`${API_BASE_URL}/api/fs/list?${params}`);
    return handleResponse(response);
  },

  // File read
  async readFile(path: string) {
    const response = await enhancedFetch(
      `${API_BASE_URL}/api/fs/read?path=${encodeURIComponent(path)}`
    );
    return handleResponse(response);
  },

  // File write
  async writeFile(path: string, content: string) {
    // Emulate write by uploading a single chunk with replace=true
    const parent = path.substring(0, path.lastIndexOf("/")) || "/";
    const name = path.split("/").pop() || "file.txt";
    const form = new FormData();
    form.append("path", parent);
    form.append("fileName", name);
    form.append(
      "fileId",
      `api_write_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    form.append("chunkIndex", "0");
    form.append("totalChunks", "1");
    form.append("replace", "true");
    form.append(
      "chunk",
      new Blob([content], { type: "text/plain;charset=utf-8" }),
      name
    );
    const response = await enhancedFetch(`${API_BASE_URL}/api/fs/upload-chunk`, {
      method: "POST",
      body: form,
    });
    return handleResponse(response);
  },

  // File create
  async createFile(path: string, content: string = "") {
    // Create via single-chunk upload; if content empty, upload empty blob
    const parent = path.substring(0, path.lastIndexOf("/")) || "/";
    const name = path.split("/").pop() || "untitled";
    const form = new FormData();
    form.append("path", parent);
    form.append("fileName", name);
    form.append(
      "fileId",
      `api_create_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
    form.append("chunkIndex", "0");
    form.append("totalChunks", "1");
    const blob = new Blob([content], { type: "application/octet-stream" });
    form.append("chunk", blob, name);
    const response = await enhancedFetch(`${API_BASE_URL}/api/fs/upload-chunk`, {
      method: "POST",
      body: form,
    });
    return handleResponse(response);
  },

  // File upload
  async uploadFiles(path: string, files: FileList) {
    const formData = new FormData();
    formData.append("path", path);

    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    const response = await enhancedFetch(`${API_BASE_URL}/api/fs/upload`, {
      method: "POST",
      body: formData,
    });
    return handleResponse(response);
  },

  // File operations
  async copyFile(source: string, destination: string) {
    const response = await enhancedFetch(`${API_BASE_URL}/api/fs/copy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, destination }),
    });
    return handleResponse(response);
  },

  async moveFile(source: string, destination: string) {
    const response = await enhancedFetch(`${API_BASE_URL}/api/fs/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, destination }),
    });
    return handleResponse(response);
  },

  async deleteFile(path: string) {
    // Use POST for broad compatibility
    const response = await enhancedFetch(`${API_BASE_URL}/api/fs/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    return handleResponse(response);
  },

  async createDirectory(path: string, name: string) {
    const response = await enhancedFetch(`${API_BASE_URL}/api/fs/mkdir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, name }),
    });
    return handleResponse(response);
  },

  // Download - Use nginx direct serving for better performance
  getDownloadUrl(path: string) {
    // Use nginx /download/ endpoint for direct file serving
    // Path should be relative to the static directory
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    return `/download/${cleanPath}`;
  },

  async downloadMultiple(files: string[]) {
    const response = await enhancedFetch(`${API_BASE_URL}/api/fs/download-multiple`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });
    return response; // Return response object for streaming
  },

  // Share functionality
  async createShare(shareData: {
    path: string;
    password?: string;
    expiresIn?: number;
    allowUploads?: boolean;
    disableViewer?: boolean;
    quickDownload?: boolean;
    maxBandwidth?: number;
    title?: string;
    description?: string;
    theme?: string;
    viewMode?: string;
  }) {
    const response = await enhancedFetch(`${API_BASE_URL}/api/fs/share/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shareData),
    });
    return handleResponse(response);
  },

  async getShare(shareId: string) {
    const response = await enhancedFetch(`${API_BASE_URL}/api/fs/share/${shareId}`);
    return handleResponse(response);
  },

  async accessShare(shareId: string, password?: string) {
    const response = await enhancedFetch(
      `${API_BASE_URL}/api/fs/share/${shareId}/access`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      }
    );
    return handleResponse(response);
  },

  getShareDownloadUrl(shareId: string) {
    return `${API_BASE_URL}/api/fs/share/${shareId}/download`;
  },

  // Health check
  async healthCheck() {
    const response = await enhancedFetch(`${API_BASE_URL}/health`);
    return handleResponse(response);
  },
  
  // Get metrics
  async getMetrics() {
    const response = await enhancedFetch(`${API_BASE_URL}/metrics`);
    return handleResponse(response);
  },
};

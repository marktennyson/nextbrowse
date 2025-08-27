// API client configuration for Go backend
// In Docker setup, API calls go through nginx proxy, so we use relative URLs
const API_BASE_URL = process.env.NEXT_PUBLIC_GO_API_URL || ''

export const apiClient = {
  // File listing
  async listDirectory(path: string, pagination?: {
    page?: number
    pageSize?: number
    offset?: number
    limit?: number
  }) {
    const params = new URLSearchParams({ path })
    
    if (pagination) {
      if (pagination.page !== undefined) params.set('page', pagination.page.toString())
      if (pagination.pageSize !== undefined) params.set('pageSize', pagination.pageSize.toString())
      if (pagination.offset !== undefined) params.set('offset', pagination.offset.toString())
      if (pagination.limit !== undefined) params.set('limit', pagination.limit.toString())
    }
    
    const response = await fetch(`${API_BASE_URL}/api/fs/list?${params}`)
    return response.json()
  },

  // File read
  async readFile(path: string) {
    const response = await fetch(`${API_BASE_URL}/api/fs/read?path=${encodeURIComponent(path)}`)
    return response.json()
  },

  // File upload
  async uploadFiles(path: string, files: FileList) {
    const formData = new FormData()
    formData.append('path', path)
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])
    }
    
    const response = await fetch(`${API_BASE_URL}/api/fs/upload`, {
      method: 'POST',
      body: formData,
    })
    return response.json()
  },

  // File operations
  async copyFile(source: string, destination: string) {
    const response = await fetch(`${API_BASE_URL}/api/fs/copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, destination }),
    })
    return response.json()
  },

  async moveFile(source: string, destination: string) {
    const response = await fetch(`${API_BASE_URL}/api/fs/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, destination }),
    })
    return response.json()
  },

  async deleteFile(path: string) {
    const response = await fetch(`${API_BASE_URL}/api/fs/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    return response.json()
  },

  async createDirectory(path: string, name: string) {
    const response = await fetch(`${API_BASE_URL}/api/fs/mkdir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, name }),
    })
    return response.json()
  },

  // Download - Use nginx direct serving for better performance
  getDownloadUrl(path: string) {
    // Use nginx /download/ endpoint for direct file serving
    // Path should be relative to the static directory
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    return `/download/${cleanPath}`
  },

  async downloadMultiple(files: string[]) {
    const response = await fetch(`${API_BASE_URL}/api/fs/download-multiple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
    })
    return response // Return response object for streaming
  },

  // Share functionality
  async createShare(shareData: {
    path: string
    password?: string
    expiresIn?: number
    allowUploads?: boolean
    disableViewer?: boolean
    quickDownload?: boolean
    maxBandwidth?: number
    title?: string
    description?: string
    theme?: string
    viewMode?: string
  }) {
    const response = await fetch(`${API_BASE_URL}/api/fs/share/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shareData),
    })
    return response.json()
  },

  async getShare(shareId: string) {
    const response = await fetch(`${API_BASE_URL}/api/fs/share/${shareId}`)
    return response.json()
  },

  async accessShare(shareId: string, password?: string) {
    const response = await fetch(`${API_BASE_URL}/api/fs/share/${shareId}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    return response.json()
  },

  getShareDownloadUrl(shareId: string) {
    return `${API_BASE_URL}/api/fs/share/${shareId}/download`
  },

  // Health check
  async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/health`)
    return response.json()
  },
}
package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type UploadConfig struct {
	ChunkSize           int64 `json:"chunkSize"`
	MaxConcurrentUploads int   `json:"maxConcurrentUploads"`
	MaxFileSize         int64 `json:"maxFileSize"`
}

// Return File Browser-style upload configuration
func GetUploadConfigHandler(c *gin.Context) {
	config := UploadConfig{
		ChunkSize:           8 * 1024 * 1024, // 8MB chunks for better performance like filebrowser
		MaxConcurrentUploads: 6,               // Increased concurrency for better throughput
		MaxFileSize:         10 * 1024 * 1024 * 1024, // 10GB max
	}

	c.JSON(http.StatusOK, config)
}

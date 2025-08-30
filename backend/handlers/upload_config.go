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
		ChunkSize:           2 * 1024 * 1024, // 2MB - File Browser default
		MaxConcurrentUploads: 3,               // Keep it simple
		MaxFileSize:         10 * 1024 * 1024 * 1024, // 10GB max
	}

	c.JSON(http.StatusOK, config)
}

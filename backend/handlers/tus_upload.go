package handlers

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jellydator/ttlcache/v3"

	"nextbrowse-backend/utils"
)

const (
	// TUS Protocol Configuration
	maxUploadWait    = 10 * time.Minute // Extended timeout for large files
	defaultChunkSize = 10 * 1024 * 1024 // 10MB default chunk size
	maxChunkSize     = 50 * 1024 * 1024 // 50MB max chunk size for high-speed connections
)

// Global cache to track active TUS uploads
var activeUploads = initActiveUploads()

func initActiveUploads() *ttlcache.Cache[string, int64] {
	cache := ttlcache.New[string, int64]()
	cache.OnEviction(func(_ context.Context, reason ttlcache.EvictionReason, item *ttlcache.Item[string, int64]) {
		if reason == ttlcache.EvictionReasonExpired {
			fmt.Printf("Cleaning up incomplete upload: %s\n", item.Key())
			os.Remove(item.Key())
		}
	})
	go cache.Start()
	return cache
}

func registerUpload(filePath string, fileSize int64) {
	activeUploads.Set(filePath, fileSize, maxUploadWait)
}

func completeUpload(filePath string) {
	activeUploads.Delete(filePath)
}

func getActiveUploadLength(filePath string) (int64, error) {
	item := activeUploads.Get(filePath)
	if item == nil {
		return 0, fmt.Errorf("no active upload found")
	}
	return item.Value(), nil
}

// TUS POST: Initialize upload session
func TusPostHandler(c *gin.Context) {
	pathParam := c.Query("path")
	if pathParam == "" {
		pathParam = "/"
	}

	fileName := c.GetHeader("Upload-Metadata")
	if fileName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing Upload-Metadata header"})
		return
	}

	uploadLength, err := strconv.ParseInt(c.GetHeader("Upload-Length"), 10, 64)
	if err != nil || uploadLength <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Upload-Length header"})
		return
	}

	destPath, err := utils.SafeResolve(pathParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create destination directory
	if err := os.MkdirAll(destPath, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create directory"})
		return
	}

	// Create empty file for upload
	filePath := filepath.Join(destPath, fileName)
	file, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create file"})
		return
	}
	file.Close()

	// Register upload session
	registerUpload(filePath, uploadLength)

	// Set TUS headers
	c.Header("Upload-Offset", "0")
	c.Header("Location", fmt.Sprintf("/api/tus/upload?path=%s&file=%s", pathParam, fileName))
	c.Status(http.StatusCreated)
}

// TUS HEAD: Get upload progress
func TusHeadHandler(c *gin.Context) {
	pathParam := c.Query("path")
	fileName := c.Query("file")

	if pathParam == "" || fileName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing path or file parameter"})
		return
	}

	destPath, err := utils.SafeResolve(pathParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	filePath := filepath.Join(destPath, fileName)
	
	// Get current file size
	stat, err := os.Stat(filePath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Upload not found"})
		return
	}

	uploadLength, err := getActiveUploadLength(filePath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Upload session not found"})
		return
	}

	c.Header("Cache-Control", "no-store")
	c.Header("Upload-Offset", strconv.FormatInt(stat.Size(), 10))
	c.Header("Upload-Length", strconv.FormatInt(uploadLength, 10))
	c.Status(http.StatusOK)
}

// TUS PATCH: Stream upload data
func TusPatchHandler(c *gin.Context) {
	if c.GetHeader("Content-Type") != "application/offset+octet-stream" {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{"error": "Invalid content type"})
		return
	}

	pathParam := c.Query("path")
	fileName := c.Query("file")

	if pathParam == "" || fileName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing path or file parameter"})
		return
	}

	uploadOffset, err := strconv.ParseInt(c.GetHeader("Upload-Offset"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Upload-Offset header"})
		return
	}

	destPath, err := utils.SafeResolve(pathParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	filePath := filepath.Join(destPath, fileName)

	// Verify upload session exists
	uploadLength, err := getActiveUploadLength(filePath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Upload session not found"})
		return
	}

	// Open file for writing
	file, err := os.OpenFile(filePath, os.O_WRONLY, 0644)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer file.Close()

	// Seek to offset
	if _, err := file.Seek(uploadOffset, io.SeekStart); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seek file"})
		return
	}

	// Stream data with large buffer for better performance
	buf := make([]byte, 1024*1024) // 1MB buffer
	bytesWritten, err := io.CopyBuffer(file, c.Request.Body, buf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write data"})
		return
	}

	newOffset := uploadOffset + bytesWritten
	c.Header("Upload-Offset", strconv.FormatInt(newOffset, 10))

	// Complete upload if all data received
	if newOffset >= uploadLength {
		completeUpload(filePath)
	}

	c.Status(http.StatusNoContent)
}

// TUS DELETE: Cancel upload
func TusDeleteHandler(c *gin.Context) {
	pathParam := c.Query("path")
	fileName := c.Query("file")

	if pathParam == "" || fileName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing path or file parameter"})
		return
	}

	destPath, err := utils.SafeResolve(pathParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	filePath := filepath.Join(destPath, fileName)
	
	// Remove file and complete upload session
	os.Remove(filePath)
	completeUpload(filePath)

	c.Status(http.StatusNoContent)
}

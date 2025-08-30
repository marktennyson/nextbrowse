package handlers

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jellydator/ttlcache/v3"

	"nextbrowse-backend/utils"
)

const maxUploadWait = 3 * time.Minute

// Track active uploads with their expected total size
var activeUploads = initActiveUploads()

func initActiveUploads() *ttlcache.Cache[string, int64] {
	cache := ttlcache.New[string, int64]()
	cache.OnEviction(func(_ context.Context, reason ttlcache.EvictionReason, item *ttlcache.Item[string, int64]) {
		if reason == ttlcache.EvictionReasonExpired {
			fmt.Printf("Deleting incomplete upload file: %s\n", item.Key())
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
		return 0, fmt.Errorf("no active upload found for the given path")
	}
	return item.Value(), nil
}

func keepUploadActive(filePath string) func() {
	stop := make(chan bool)
	go func() {
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-stop:
				return
			case <-ticker.C:
				activeUploads.Touch(filePath)
			}
		}
	}()
	return func() {
		close(stop)
	}
}

// TUS POST - Create upload session (File Browser style)
func TusPostHandler(c *gin.Context) {
	pathParam := c.Query("path")
	if pathParam == "" {
		pathParam = "/"
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

	// Check if file exists and handle override
	override := c.Query("override") == "true"
	if utils.FileExists(destPath) {
		if !override {
			c.JSON(http.StatusConflict, gin.H{"error": "File already exists"})
			return
		}
	}

	// Create file - File Browser style
	flags := os.O_CREATE | os.O_WRONLY
	if override {
		flags |= os.O_TRUNC
	}

	file, err := os.OpenFile(destPath, flags, 0644)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create file"})
		return
	}
	defer file.Close()

	// Register upload for tracking
	registerUpload(destPath, uploadLength)

	// Set location header for PATCH requests
	location := fmt.Sprintf("/api/tus%s", pathParam)
	c.Header("Location", location)
	c.Status(http.StatusCreated)
}

// TUS HEAD - Get upload status (File Browser style)
func TusHeadHandler(c *gin.Context) {
	pathParam := c.Query("path")
	if pathParam == "" {
		pathParam = "/"
	}

	destPath, err := utils.SafeResolve(pathParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	uploadLength, err := getActiveUploadLength(destPath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No active upload found"})
		return
	}

	// Get current file size as upload offset
	uploadOffset := int64(0)
	if stat, err := os.Stat(destPath); err == nil {
		uploadOffset = stat.Size()
	}

	c.Header("Cache-Control", "no-store")
	c.Header("Upload-Offset", strconv.FormatInt(uploadOffset, 10))
	c.Header("Upload-Length", strconv.FormatInt(uploadLength, 10))
	c.Status(http.StatusOK)
}

// TUS PATCH - Upload chunk (File Browser style)
func TusPatchHandler(c *gin.Context) {
	pathParam := c.Query("path")
	if pathParam == "" {
		pathParam = "/"
	}

	// Validate Content-Type
	if c.GetHeader("Content-Type") != "application/offset+octet-stream" {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{"error": "Invalid Content-Type"})
		return
	}

	uploadOffset, err := strconv.ParseInt(c.GetHeader("Upload-Offset"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Upload-Offset"})
		return
	}

	destPath, err := utils.SafeResolve(pathParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	uploadLength, err := getActiveUploadLength(destPath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No active upload found"})
		return
	}

	// Verify file exists and current size matches offset
	stat, err := os.Stat(destPath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Upload file not found"})
		return
	}

	if stat.Size() != uploadOffset {
		c.JSON(http.StatusConflict, gin.H{
			"error": fmt.Sprintf("File size doesn't match offset: %d", uploadOffset),
		})
		return
	}

	// Keep upload active during transfer
	stop := keepUploadActive(destPath)
	defer stop()

	// Open file for appending
	file, err := os.OpenFile(destPath, os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not open file"})
		return
	}
	defer file.Close()

	// Seek to upload offset
	_, err = file.Seek(uploadOffset, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not seek file"})
		return
	}

	// Stream request body directly to file - File Browser style
	defer c.Request.Body.Close()
	bytesWritten, err := io.Copy(file, c.Request.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not write to file"})
		return
	}

	newOffset := uploadOffset + bytesWritten
	c.Header("Upload-Offset", strconv.FormatInt(newOffset, 10))

	// Complete upload if we've reached the total size
	if newOffset >= uploadLength {
		completeUpload(destPath)
	}

	c.Status(http.StatusNoContent)
}

// TUS DELETE - Cancel upload (File Browser style)
func TusDeleteHandler(c *gin.Context) {
	pathParam := c.Query("path")
	if pathParam == "" {
		pathParam = "/"
	}

	destPath, err := utils.SafeResolve(pathParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err = getActiveUploadLength(destPath)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No active upload found"})
		return
	}

	// Remove the file and complete upload tracking
	err = os.Remove(destPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not remove file"})
		return
	}

	completeUpload(destPath)
	c.Status(http.StatusNoContent)
}

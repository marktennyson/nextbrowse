package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// Simple TUS implementation matching File Browser style
func TusPostHandler(c *gin.Context) {
	uploadLength := c.GetHeader("Upload-Length")
	if uploadLength == "" {
		c.Header("Tus-Resumable", "1.0.0")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Upload-Length header required"})
		return
	}

	size, err := strconv.ParseInt(uploadLength, 10, 64)
	if err != nil || size <= 0 {
		c.Header("Tus-Resumable", "1.0.0")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Upload-Length"})
		return
	}

	// Generate upload ID and path
	uploadID := fmt.Sprintf("%d", time.Now().UnixNano())
	rootDir := c.Query("root")
	if rootDir == "" {
		rootDir = "."
	}

	c.Header("Tus-Resumable", "1.0.0")
	c.Header("Location", "/api/upload/"+uploadID)
	c.Header("Upload-Offset", "0")
	c.Status(http.StatusCreated)
}

func TusHeadHandler(c *gin.Context) {
	uploadID := c.Param("id")
	if uploadID == "" {
		c.Header("Tus-Resumable", "1.0.0")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Upload ID required"})
		return
	}

	rootDir := c.Query("root")
	if rootDir == "" {
		rootDir = "."
	}
	
	partFile := rootDir + "/" + uploadID + ".part"
	
	// Get current file size
	offset := int64(0)
	if stat, err := os.Stat(partFile); err == nil {
		offset = stat.Size()
	}

	c.Header("Tus-Resumable", "1.0.0")
	c.Header("Upload-Offset", fmt.Sprintf("%d", offset))
	c.Header("Cache-Control", "no-store")
	c.Status(http.StatusOK)
}

func TusPatchHandler(c *gin.Context) {
	uploadID := c.Param("id")
	if uploadID == "" {
		c.Header("Tus-Resumable", "1.0.0")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Upload ID required"})
		return
	}

	contentType := c.GetHeader("Content-Type")
	if contentType != "application/offset+octet-stream" {
		c.Header("Tus-Resumable", "1.0.0")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Content-Type"})
		return
	}

	uploadOffset := c.GetHeader("Upload-Offset")
	if uploadOffset == "" {
		c.Header("Tus-Resumable", "1.0.0")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Upload-Offset header required"})
		return
	}

	offset, err := strconv.ParseInt(uploadOffset, 10, 64)
	if err != nil {
		c.Header("Tus-Resumable", "1.0.0")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Upload-Offset"})
		return
	}

	rootDir := c.Query("root")
	if rootDir == "" {
		rootDir = "."
	}
	
	partFile := rootDir + "/" + uploadID + ".part"

	// Open or create file
	file, err := os.OpenFile(partFile, os.O_WRONLY|os.O_CREATE, 0644)
	if err != nil {
		c.Header("Tus-Resumable", "1.0.0")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Cannot open file"})
		return
	}
	defer file.Close()

	// Seek to offset
	if _, err := file.Seek(offset, 0); err != nil {
		c.Header("Tus-Resumable", "1.0.0")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Cannot seek file"})
		return
	}

	// Stream data directly - File Browser style
	written, err := io.Copy(file, c.Request.Body)
	if err != nil {
		c.Header("Tus-Resumable", "1.0.0")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Upload failed"})
		return
	}

	newOffset := offset + written

	c.Header("Tus-Resumable", "1.0.0")
	c.Header("Upload-Offset", fmt.Sprintf("%d", newOffset))
	c.Status(http.StatusNoContent)
}

func TusDeleteHandler(c *gin.Context) {
	uploadID := c.Param("id")
	if uploadID == "" {
		c.Header("Tus-Resumable", "1.0.0")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Upload ID required"})
		return
	}

	rootDir := c.Query("root")
	if rootDir == "" {
		rootDir = "."
	}
	
	partFile := rootDir + "/" + uploadID + ".part"
	finalFile := rootDir + "/" + uploadID

	// Clean up files
	os.Remove(partFile)
	os.Remove(finalFile)

	c.Header("Tus-Resumable", "1.0.0")
	c.Status(http.StatusNoContent)
}

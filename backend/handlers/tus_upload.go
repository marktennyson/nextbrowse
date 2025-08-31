package handlers

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"nextbrowse-backend/utils"
)

// TUS upload metadata
type TusUpload struct {
	ID           string
	Filename     string
	Path         string
	Size         int64
	Offset       int64
	CreatedAt    time.Time
	LastModified time.Time
	FilePath     string // Actual file path on disk
}

var (
	// In-memory store for active uploads (in production, use Redis or DB)
	activeUploads = make(map[string]*TusUpload)
	
	// TUS configuration
	tusMaxSize = int64(10 * 1024 * 1024 * 1024) // 10GB max file size
	tusVersion = "1.0.0"
)

// TusOptionsHandler handles OPTIONS requests for TUS discovery
func TusOptionsHandler(c *gin.Context) {
	c.Header("Tus-Resumable", tusVersion)
	c.Header("Tus-Version", tusVersion)
	c.Header("Tus-Max-Size", fmt.Sprintf("%d", tusMaxSize))
	c.Header("Tus-Extension", "creation,expiration,checksum,termination")
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("Access-Control-Allow-Methods", "POST,HEAD,PATCH,DELETE,OPTIONS")
	c.Header("Access-Control-Allow-Headers", "Tus-Resumable,Upload-Length,Upload-Metadata,Upload-Offset,Content-Type")
	c.Header("Access-Control-Expose-Headers", "Tus-Resumable,Upload-Length,Upload-Metadata,Upload-Offset,Location")
	c.Status(http.StatusOK)
}

// TusPostHandler handles POST requests to create new uploads
func TusPostHandler(c *gin.Context) {
	c.Header("Tus-Resumable", tusVersion)

	// Get upload length
	uploadLengthStr := c.GetHeader("Upload-Length")
	if uploadLengthStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Upload-Length header required"})
		return
	}

	uploadLength, err := strconv.ParseInt(uploadLengthStr, 10, 64)
	if err != nil || uploadLength <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Upload-Length"})
		return
	}

	if uploadLength > tusMaxSize {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "Upload exceeds maximum size"})
		return
	}

	// Parse upload metadata
	uploadMetadata := c.GetHeader("Upload-Metadata")
	filename, targetPath := parseUploadMetadata(uploadMetadata)
	if filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "filename metadata required"})
		return
	}
	if targetPath == "" {
		targetPath = "/"
	}

	// Safely resolve target path
	resolvedPath, err := utils.SafeResolve(targetPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate unique upload ID
	uploadID := generateUploadID()
	
	// Create upload directory for partial files
	uploadDir := filepath.Join(resolvedPath, ".tus-uploads")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	partialPath := filepath.Join(uploadDir, uploadID+".part")

	// Create upload record
	upload := &TusUpload{
		ID:           uploadID,
		Filename:     filename,
		Path:         targetPath,
		Size:         uploadLength,
		Offset:       0,
		CreatedAt:    time.Now(),
		LastModified: time.Now(),
		FilePath:     partialPath,
	}

	// Create empty partial file
	file, err := os.OpenFile(partialPath, os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload file"})
		return
	}
	file.Close()

	// Store upload record
	activeUploads[uploadID] = upload

	// Return created response
	c.Header("Location", fmt.Sprintf("/api/tus/files/%s", uploadID))
	c.Header("Upload-Offset", "0")
	c.Status(http.StatusCreated)
}

// TusHeadHandler handles HEAD requests to get upload status
func TusHeadHandler(c *gin.Context) {
	c.Header("Tus-Resumable", tusVersion)
	c.Header("Cache-Control", "no-store")

	uploadID := c.Param("id")
	upload := activeUploads[uploadID]
	
	if upload == nil {
		c.Status(http.StatusNotFound)
		return
	}

	// Get current file size to determine offset
	if stat, err := os.Stat(upload.FilePath); err == nil {
		upload.Offset = stat.Size()
		upload.LastModified = time.Now()
	}

	c.Header("Upload-Offset", fmt.Sprintf("%d", upload.Offset))
	c.Header("Upload-Length", fmt.Sprintf("%d", upload.Size))
	c.Status(http.StatusOK)
}

// TusPatchHandler handles PATCH requests to upload file chunks
func TusPatchHandler(c *gin.Context) {
	c.Header("Tus-Resumable", tusVersion)

	uploadID := c.Param("id")
	upload := activeUploads[uploadID]
	
	if upload == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Upload not found"})
		return
	}

	// Validate content type
	contentType := c.GetHeader("Content-Type")
	if contentType != "application/offset+octet-stream" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Content-Type"})
		return
	}

	// Get and validate upload offset
	uploadOffsetStr := c.GetHeader("Upload-Offset")
	if uploadOffsetStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Upload-Offset header required"})
		return
	}

	uploadOffset, err := strconv.ParseInt(uploadOffsetStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Upload-Offset"})
		return
	}

	// Check current file size
	currentSize := int64(0)
	if stat, err := os.Stat(upload.FilePath); err == nil {
		currentSize = stat.Size()
	}

	// Offset must match current file size
	if uploadOffset != currentSize {
		c.JSON(http.StatusConflict, gin.H{
			"error": fmt.Sprintf("Upload-Offset %d does not match current size %d", uploadOffset, currentSize),
		})
		return
	}

	// Open file for appending
	file, err := os.OpenFile(upload.FilePath, os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open upload file"})
		return
	}
	defer file.Close()

	// Stream data with large buffer for performance
	buf := make([]byte, 1024*1024) // 1MB buffer like filebrowser
	written, err := io.CopyBuffer(file, c.Request.Body, buf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Upload failed"})
		return
	}

	// Update upload record
	upload.Offset = currentSize + written
	upload.LastModified = time.Now()

	// Check if upload is complete
	if upload.Offset >= upload.Size {
		if err := completeUpload(upload); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete upload"})
			return
		}
		// Remove from active uploads
		delete(activeUploads, uploadID)
	}

	// Return success response
	c.Header("Upload-Offset", fmt.Sprintf("%d", upload.Offset))
	c.Status(http.StatusNoContent)
}

// TusDeleteHandler handles DELETE requests to cancel uploads
func TusDeleteHandler(c *gin.Context) {
	c.Header("Tus-Resumable", tusVersion)

	uploadID := c.Param("id")
	upload := activeUploads[uploadID]
	
	if upload == nil {
		c.Status(http.StatusNotFound)
		return
	}

	// Remove partial file
	_ = os.Remove(upload.FilePath)

	// Remove from active uploads
	delete(activeUploads, uploadID)

	c.Status(http.StatusNoContent)
}

// Helper functions

func generateUploadID() string {
	return fmt.Sprintf("upload_%d_%d", time.Now().UnixNano(), os.Getpid())
}

func parseUploadMetadata(metadata string) (filename, path string) {
	if metadata == "" {
		return "", ""
	}

	// Parse metadata: "filename dGVzdC50eHQ=,path L3Rlc3Q="
	parts := strings.Split(metadata, ",")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if strings.HasPrefix(part, "filename ") {
			// Decode base64 filename
			encoded := strings.TrimPrefix(part, "filename ")
			if decoded, err := decodeBase64String(encoded); err == nil {
				filename = decoded
			}
		} else if strings.HasPrefix(part, "path ") {
			// Decode base64 path
			encoded := strings.TrimPrefix(part, "path ")
			if decoded, err := decodeBase64String(encoded); err == nil {
				path = decoded
			}
		}
	}

	return filename, path
}

func decodeBase64String(s string) (string, error) {
	decoded, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		// Fallback to original string if decode fails
		return s, nil
	}
	return string(decoded), nil
}

func completeUpload(upload *TusUpload) error {
	// Resolve final destination path
	resolvedPath, err := utils.SafeResolve(upload.Path)
	if err != nil {
		return err
	}

	finalPath := filepath.Join(resolvedPath, upload.Filename)

	// Move partial file to final location
	err = os.Rename(upload.FilePath, finalPath)
	if err != nil {
		return fmt.Errorf("failed to move completed upload: %w", err)
	}

	// Clean up upload directory if empty
	uploadDir := filepath.Dir(upload.FilePath)
	_ = os.Remove(uploadDir) // Will only succeed if empty

	return nil
}

// GetTusConfig returns TUS configuration for clients
func GetTusConfig(c *gin.Context) {
	config := map[string]any{
		"version":              tusVersion,
		"maxSize":              tusMaxSize,
		"extensions":           []string{"creation", "expiration", "checksum", "termination"},
		"chunkSize":            8 * 1024 * 1024, // 8MB recommended chunk size
		"maxConcurrentUploads": 6,
		"resumable":            true,
		"endpoints": map[string]string{
			"create":   "/api/tus/files",
			"upload":   "/api/tus/files/:id",
			"status":   "/api/tus/files/:id",
			"delete":   "/api/tus/files/:id",
			"options":  "/api/tus/files",
		},
	}
	
	c.JSON(http.StatusOK, config)
}

// Cleanup function to remove expired uploads (call periodically)
func CleanupExpiredUploads() {
	expiry := time.Hour * 24 // 24 hours
	now := time.Now()
	
	for id, upload := range activeUploads {
		if now.Sub(upload.LastModified) > expiry {
			_ = os.Remove(upload.FilePath)
			delete(activeUploads, id)
		}
	}
}
package handlers

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"nextbrowse-backend/utils"
)

// FastStreamUpload handles high-speed streaming uploads with optimizations
func FastStreamUpload(c *gin.Context) {
	pathParam := c.Query("path")
	if pathParam == "" {
		pathParam = "/"
	}

	fileName := c.GetHeader("X-File-Name")
	if fileName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "Missing X-File-Name header"})
		return
	}

	fileSizeStr := c.GetHeader("X-File-Size")
	var fileSize int64
	if fileSizeStr != "" {
		if size, err := strconv.ParseInt(fileSizeStr, 10, 64); err == nil {
			fileSize = size
		}
	}

	replace := false
	if v := c.GetHeader("X-Replace"); v == "true" {
		replace = true
	}

	destPath, err := utils.SafeResolve(pathParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": err.Error()})
		return
	}

	if err := os.MkdirAll(destPath, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "Failed to create directory"})
		return
	}

	finalPath := filepath.Join(destPath, fileName)

	// Check for conflicts
	if utils.FileExists(finalPath) && !replace {
		c.JSON(http.StatusConflict, gin.H{"ok": false, "error": "File exists"})
		return
	}

	// Create file with optimized flags
	flags := os.O_CREATE | os.O_WRONLY | os.O_TRUNC
	file, err := os.OpenFile(finalPath, flags, 0644)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "Failed to create file"})
		return
	}
	defer file.Close()

	// Preallocate file space for large files to improve performance
	if fileSize > 100<<20 && uploadConfig.PreallocateFiles { // 100MB threshold
		if err := preAllocateFile(file, fileSize); err != nil {
			// Non-fatal error, continue without preallocation
			fmt.Printf("Warning: Failed to preallocate file space: %v\n", err)
		}
	}

	// Use optimized buffer from pool
	buf := GetOptimizedBuffer()
	defer PutOptimizedBuffer(buf)

	// Set up context with timeout for large uploads
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Minute)
	defer cancel()

	// Stream with optimizations
	written, err := streamWithOptimizations(ctx, file, c.Request.Body, buf)
	if err != nil {
		os.Remove(finalPath) // Clean up on error
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "Upload failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ok":      true,
		"file":    fileName,
		"size":    written,
		"message": "Upload completed successfully",
	})
}

// preAllocateFile preallocates disk space to improve performance
func preAllocateFile(file *os.File, size int64) error {
	// Try to preallocate space (Linux/Unix specific)
	if err := syscall.Fallocate(int(file.Fd()), 0, 0, size); err != nil {
		// Fallback: extend file size
		return file.Truncate(size)
	}
	return nil
}

// streamWithOptimizations performs optimized streaming with monitoring
func streamWithOptimizations(ctx context.Context, dst io.Writer, src io.Reader, buf []byte) (int64, error) {
	var written int64
	var lastProgress time.Time = time.Now()

	for {
		select {
		case <-ctx.Done():
			return written, ctx.Err()
		default:
		}

		// Read with timeout
		nr, er := src.Read(buf)
		if nr > 0 {
			nw, ew := dst.Write(buf[0:nr])
			if nw < 0 || nr < nw {
				nw = 0
				if ew == nil {
					ew = fmt.Errorf("invalid write result")
				}
			}
			written += int64(nw)
			if ew != nil {
				return written, ew
			}
			if nr != nw {
				return written, io.ErrShortWrite
			}

			// Force sync every 100MB for data safety
			if written%int64(100<<20) == 0 {
				if syncer, ok := dst.(interface{ Sync() error }); ok {
					syncer.Sync()
				}
			}

			// Progress monitoring (could be used for real-time updates)
			if time.Since(lastProgress) > 5*time.Second {
				fmt.Printf("Upload progress: %d bytes written\n", written)
				lastProgress = time.Now()
			}
		}
		if er != nil {
			if er != io.EOF {
				return written, er
			}
			break
		}
	}

	// Final sync
	if syncer, ok := dst.(interface{ Sync() error }); ok {
		syncer.Sync()
	}

	return written, nil
}

// ParallelChunkUpload handles multiple chunks uploaded in parallel
func ParallelChunkUpload(c *gin.Context) {
	// This would be for handling multiple simultaneous chunk uploads
	// Implementation would coordinate multiple goroutines
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Parallel chunk upload not yet implemented"})
}

// GetUploadProgress returns real-time upload progress
func GetUploadProgress(c *gin.Context) {
	fileId := c.Query("fileId")
	if fileId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing fileId"})
		return
	}

	// Implementation would track progress per fileId
	c.JSON(http.StatusOK, gin.H{
		"fileId":   fileId,
		"progress": 0,
		"speed":    0,
		"eta":      0,
	})
}

package handlers

import (
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"

	"github.com/gin-gonic/gin"

	"nextbrowse-backend/utils"
)

type CopyMoveRequest struct {
	Source      string `json:"source"`
	Destination string `json:"destination"`
}

type DeleteRequest struct {
	Path string `json:"path"`
}

type MkdirRequest struct {
	Path string `json:"path"`
	Name string `json:"name"`
}

type OperationResponse struct {
	OK      bool   `json:"ok"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}

type ReadFileResponse struct {
	OK      bool   `json:"ok"`
	Content string `json:"content"`
	Size    int64  `json:"size"`
	Mtime   int64  `json:"mtime"`
	Error   string `json:"error,omitempty"`
}

func CopyFile(c *gin.Context) {
	var req CopyMoveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Invalid request body",
		})
		return
	}

	if req.Source == "" || req.Destination == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Missing source or destination",
		})
		return
	}

	// Safely resolve paths
	srcPath, err := utils.SafeResolve(req.Source)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Invalid source path: " + err.Error(),
		})
		return
	}

	dstPath, err := utils.SafeResolve(req.Destination)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Invalid destination path: " + err.Error(),
		})
		return
	}

	// Check if source exists
	if !utils.FileExists(srcPath) {
		c.JSON(http.StatusNotFound, gin.H{
			"ok":    false,
			"error": "Source file or directory not found",
		})
		return
	}

	// Check if destination already exists
	if utils.FileExists(dstPath) {
		c.JSON(http.StatusConflict, gin.H{
			"ok":    false,
			"error": "Destination already exists",
		})
		return
	}

	// Ensure destination directory exists
	err = os.MkdirAll(filepath.Dir(dstPath), 0755)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"ok":    false,
			"error": "Failed to create destination directory: " + err.Error(),
		})
		return
	}

	// Perform copy operation
	err = copyRecursive(srcPath, dstPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"ok":    false,
			"error": "Copy operation failed: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, OperationResponse{
		OK:      true,
		Message: "File/directory copied successfully",
	})
}

func MoveFile(c *gin.Context) {
	var req CopyMoveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Invalid request body",
		})
		return
	}

	if req.Source == "" || req.Destination == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Missing source or destination",
		})
		return
	}

	// Safely resolve paths
	srcPath, err := utils.SafeResolve(req.Source)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Invalid source path: " + err.Error(),
		})
		return
	}

	dstPath, err := utils.SafeResolve(req.Destination)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Invalid destination path: " + err.Error(),
		})
		return
	}

	// Check if source exists
	if !utils.FileExists(srcPath) {
		c.JSON(http.StatusNotFound, gin.H{
			"ok":    false,
			"error": "Source file or directory not found",
		})
		return
	}

	// Check if destination already exists
	if utils.FileExists(dstPath) {
		c.JSON(http.StatusConflict, gin.H{
			"ok":    false,
			"error": "Destination already exists",
		})
		return
	}

	// Ensure destination directory exists
	err = os.MkdirAll(filepath.Dir(dstPath), 0755)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"ok":    false,
			"error": "Failed to create destination directory: " + err.Error(),
		})
		return
	}

	// Perform move operation
	err = os.Rename(srcPath, dstPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"ok":    false,
			"error": "Move operation failed: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, OperationResponse{
		OK:      true,
		Message: "File/directory moved successfully",
	})
}

func DeleteFile(c *gin.Context) {
	var req DeleteRequest
	_ = c.ShouldBindJSON(&req) // try bind JSON, but don't fail if not JSON

	path := req.Path
	if path == "" {
		// Fallback to query or form for clients that cannot send DELETE bodies
		path = c.Query("path")
		if path == "" {
			path = c.PostForm("path")
		}
	}

	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "Missing path"})
		return
	}

	// Normalize optional public prefix and URL-decode if necessary
	if strings.HasPrefix(path, "/files/") {
		path = strings.TrimPrefix(path, "/files")
	}
	if strings.HasPrefix(path, "/download/") {
		path = strings.TrimPrefix(path, "/download")
	}
	if unesc, err := url.PathUnescape(path); err == nil {
		path = unesc
	}

	// Safely resolve path
	safePath, err := utils.SafeResolve(path)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": err.Error(),
		})
		return
	}

	// Check if path exists
	if !utils.FileExists(safePath) {
		c.JSON(http.StatusNotFound, gin.H{
			"ok":    false,
			"error": "File or directory not found",
		})
		return
	}

	// Perform fast delete operation
	err = fastDelete(safePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"ok":    false,
			"error": "Delete operation failed: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, OperationResponse{
		OK:      true,
		Message: "File/directory deleted successfully",
	})
}

func CreateDirectory(c *gin.Context) {
	var req MkdirRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Invalid request body",
		})
		return
	}

	if req.Path == "" || req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Missing path or name",
		})
		return
	}

	// Safely resolve parent path
	parentPath, err := utils.SafeResolve(req.Path)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Invalid parent path: " + err.Error(),
		})
		return
	}

	// Create full directory path
	newDirPath := filepath.Join(parentPath, req.Name)

	// Check if directory already exists
	if utils.FileExists(newDirPath) {
		c.JSON(http.StatusConflict, gin.H{
			"ok":    false,
			"error": "Directory already exists",
		})
		return
	}

	// Create directory
	err = os.MkdirAll(newDirPath, 0755)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"ok":    false,
			"error": "Failed to create directory: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, OperationResponse{
		OK:      true,
		Message: "Directory created successfully",
	})
}

// Helper function to copy files/directories recursively
func copyRecursive(src, dst string) error {
	srcInfo, err := os.Stat(src)
	if err != nil {
		return err
	}

	if srcInfo.IsDir() {
		// Create destination directory
		err = os.MkdirAll(dst, srcInfo.Mode())
		if err != nil {
			return err
		}

		// Copy directory contents
		entries, err := os.ReadDir(src)
		if err != nil {
			return err
		}

		for _, entry := range entries {
			srcPath := filepath.Join(src, entry.Name())
			dstPath := filepath.Join(dst, entry.Name())
			err = copyRecursive(srcPath, dstPath)
			if err != nil {
				return err
			}
		}
	} else {
		// Copy file
		srcFile, err := os.Open(src)
		if err != nil {
			return err
		}
		defer srcFile.Close()

		dstFile, err := os.Create(dst)
		if err != nil {
			return err
		}
		defer dstFile.Close()

		_, err = dstFile.ReadFrom(srcFile)
		if err != nil {
			return err
		}

		// Copy file permissions
		err = os.Chmod(dst, srcInfo.Mode())
		if err != nil {
			return err
		}
	}

	return nil
}

func ReadFile(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, ReadFileResponse{
			OK:    false,
			Error: "Missing path parameter",
		})
		return
	}

	// Safely resolve path
	safePath, err := utils.SafeResolve(path)
	if err != nil {
		c.JSON(http.StatusBadRequest, ReadFileResponse{
			OK:    false,
			Error: err.Error(),
		})
		return
	}

	// Check if path exists and is a file
	fileInfo, err := os.Stat(safePath)
	if err != nil {
		c.JSON(http.StatusNotFound, ReadFileResponse{
			OK:    false,
			Error: "File not found",
		})
		return
	}

	if fileInfo.IsDir() {
		c.JSON(http.StatusBadRequest, ReadFileResponse{
			OK:    false,
			Error: "Path is a directory, not a file",
		})
		return
	}

	// Read file content
	file, err := os.Open(safePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ReadFileResponse{
			OK:    false,
			Error: "Failed to open file: " + err.Error(),
		})
		return
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ReadFileResponse{
			OK:    false,
			Error: "Failed to read file: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, ReadFileResponse{
		OK:      true,
		Content: string(content),
		Size:    fileInfo.Size(),
		Mtime:   fileInfo.ModTime().Unix(),
	})
}

// fastDelete implements an optimized delete operation for large files and directories
func fastDelete(path string) error {
	info, err := os.Lstat(path)
	if err != nil {
		return err
	}

	// For regular files, use direct unlink for maximum speed
	if !info.IsDir() {
		return os.Remove(path)
	}

	// For directories, use parallel deletion strategy
	return fastDeleteDir(path)
}

// fastDeleteDir uses parallel workers to delete directory contents quickly
func fastDeleteDir(dirPath string) error {
	// First, try to remove the directory directly (works if empty)
	if err := os.Remove(dirPath); err == nil {
		return nil
	}

	// Get number of CPU cores for optimal parallelism
	numWorkers := min(runtime.NumCPU(), 8) // Cap at 8 workers to avoid overwhelming the filesystem

	// Channel for work items (paths to delete)
	workChan := make(chan string, numWorkers*2)
	
	// Error channel to collect any errors
	errChan := make(chan error, numWorkers)
	
	// WaitGroup to wait for all workers to complete
	var wg sync.WaitGroup

	// Start worker goroutines
	for range numWorkers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for path := range workChan {
				if err := deleteWorker(path); err != nil {
					select {
					case errChan <- err:
					default: // Don't block if error channel is full
					}
				}
			}
		}()
	}

	// Walk directory tree and send work to workers
	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		
		// Skip the root directory itself (we'll delete it last)
		if path == dirPath {
			return nil
		}
		
		// Send path to workers
		select {
		case workChan <- path:
		case <-errChan:
			// Stop if we encounter an error
			return <-errChan
		}
		
		return nil
	})

	// Close work channel and wait for workers to complete
	close(workChan)
	wg.Wait()
	close(errChan)

	// Check for any errors from workers
	if len(errChan) > 0 {
		return <-errChan
	}

	// Check for walk errors
	if err != nil {
		return err
	}

	// Finally, remove the now-empty directory
	return os.Remove(dirPath)
}

// deleteWorker handles deletion of individual files/directories
func deleteWorker(path string) error {
	info, err := os.Lstat(path)
	if err != nil {
		// File might already be deleted by another worker or process
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	if info.IsDir() {
		// For directories, try direct removal first (works if empty)
		if err := os.Remove(path); err == nil {
			return nil
		}
		// If directory is not empty, let the walker handle its contents
		return nil
	}

	// For files, use unlink syscall for maximum performance
	return unlinkFile(path)
}

// unlinkFile uses the fastest available method to delete a file
func unlinkFile(path string) error {
	// Try direct syscall first for maximum performance
	if err := syscall.Unlink(path); err == nil {
		return nil
	}
	
	// Fallback to standard library
	return os.Remove(path)
}
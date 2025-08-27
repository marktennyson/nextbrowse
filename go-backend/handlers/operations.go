package handlers

import (
	"io"
	"net/http"
	"os"
	"path/filepath"

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
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Invalid request body",
		})
		return
	}

	if req.Path == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Missing path",
		})
		return
	}

	// Safely resolve path
	safePath, err := utils.SafeResolve(req.Path)
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

	// Perform delete operation
	err = os.RemoveAll(safePath)
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
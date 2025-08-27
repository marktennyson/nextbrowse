package handlers

import (
	"archive/zip"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"

	"nextbrowse-backend/utils"
)

type DownloadMultipleRequest struct {
	Files []string `json:"files"`
}

func DownloadFile(c *gin.Context) {
	userPath := c.Query("path")
	if userPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Missing path parameter",
		})
		return
	}

	// Safely resolve path
	safePath, err := utils.SafeResolve(userPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": err.Error(),
		})
		return
	}

	// Check if file exists
	if !utils.FileExists(safePath) {
		c.JSON(http.StatusNotFound, gin.H{
			"ok":    false,
			"error": "File not found",
		})
		return
	}

	// Check if it's a file (not directory)
	if utils.IsDirectory(safePath) {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Cannot download directory, use download-multiple for zipping",
		})
		return
	}

	// Get file info
	fileInfo, err := os.Stat(safePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"ok":    false,
			"error": "Failed to get file info",
		})
		return
	}

	// Set headers for file download
	filename := filepath.Base(safePath)
	c.Header("Content-Disposition", "attachment; filename=\""+filename+"\"")
	c.Header("Content-Type", "application/octet-stream")
	c.Header("Content-Length", fmt.Sprintf("%d", fileInfo.Size()))

	// Stream file to client
	c.File(safePath)
}

func DownloadMultiple(c *gin.Context) {
	var req DownloadMultipleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Invalid request body",
		})
		return
	}

	if len(req.Files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "No files specified",
		})
		return
	}

	// Validate all paths first
	var validPaths []string
	for _, userPath := range req.Files {
		safePath, err := utils.SafeResolve(userPath)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"ok":    false,
				"error": "Invalid path: " + userPath + " - " + err.Error(),
			})
			return
		}

		if !utils.FileExists(safePath) {
			c.JSON(http.StatusNotFound, gin.H{
				"ok":    false,
				"error": "File not found: " + userPath,
			})
			return
		}

		validPaths = append(validPaths, safePath)
	}

	// Set headers for ZIP download
	c.Header("Content-Disposition", "attachment; filename=\"files.zip\"")
	c.Header("Content-Type", "application/zip")

	// Create ZIP writer that writes directly to response
	zipWriter := zip.NewWriter(c.Writer)
	defer zipWriter.Close()

	// Add each file/directory to ZIP
	for i, safePath := range validPaths {
		userPath := req.Files[i]
		err := addToZip(zipWriter, safePath, filepath.Base(userPath))
		if err != nil {
			// Can't return JSON error here since we've already started streaming
			// Just log the error and continue
			continue
		}
	}
}

// Helper function to add files/directories to ZIP archive
func addToZip(zw *zip.Writer, sourcePath, basePath string) error {
	return filepath.Walk(sourcePath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Create ZIP entry path
		relPath, err := filepath.Rel(sourcePath, path)
		if err != nil {
			return err
		}

		zipPath := filepath.Join(basePath, relPath)
		// Convert to forward slashes for ZIP compatibility
		zipPath = strings.ReplaceAll(zipPath, "\\", "/")

		if info.IsDir() {
			// Create directory entry (with trailing slash)
			if !strings.HasSuffix(zipPath, "/") {
				zipPath += "/"
			}
			_, err := zw.Create(zipPath)
			return err
		}

		// Create file entry
		zipFile, err := zw.Create(zipPath)
		if err != nil {
			return err
		}

		// Open source file
		srcFile, err := os.Open(path)
		if err != nil {
			return err
		}
		defer srcFile.Close()

		// Copy file content
		_, err = io.Copy(zipFile, srcFile)
		return err
	})
}
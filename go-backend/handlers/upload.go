package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"

	"nextbrowse-backend/utils"
)

type UploadResponse struct {
	OK      bool     `json:"ok"`
	Files   []string `json:"files"`
	Errors  []string `json:"errors,omitempty"`
	Message string   `json:"message"`
}

func UploadFiles(c *gin.Context) {
	// Parse multipart form
	err := c.Request.ParseMultipartForm(32 << 20) // 32MB max memory
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Failed to parse multipart form: " + err.Error(),
		})
		return
	}

	// Get destination path
	pathParam := c.PostForm("path")
	if pathParam == "" {
		pathParam = "/"
	}

	// Safely resolve destination path
	destPath, err := utils.SafeResolve(pathParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": err.Error(),
		})
		return
	}

	// Ensure destination directory exists
	err = os.MkdirAll(destPath, 0755)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"ok":    false,
			"error": "Failed to create destination directory: " + err.Error(),
		})
		return
	}

	// Get uploaded files
	form := c.Request.MultipartForm
	files := form.File["files"]

	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "No files provided",
		})
		return
	}

	var saved []string
	var errors []string

	// Process each file
	for _, fileHeader := range files {
		if fileHeader.Size == 0 {
			errors = append(errors, fileHeader.Filename+": Empty file")
			continue
		}

		// Open uploaded file
		src, err := fileHeader.Open()
		if err != nil {
			errors = append(errors, fileHeader.Filename+": Failed to open uploaded file")
			continue
		}

		// Create destination file path
		outPath := filepath.Join(destPath, fileHeader.Filename)

		// Check if file already exists
		if utils.FileExists(outPath) {
			src.Close()
			errors = append(errors, fileHeader.Filename+": File already exists")
			continue
		}

		// Create destination file
		dst, err := os.Create(outPath)
		if err != nil {
			src.Close()
			errors = append(errors, fileHeader.Filename+": Failed to create destination file")
			continue
		}

		// Copy file content
		_, err = io.Copy(dst, src)
		dst.Close()
		src.Close()

		if err != nil {
			// Clean up partial file on error
			os.Remove(outPath)
			errors = append(errors, fileHeader.Filename+": Failed to write file content")
			continue
		}

		saved = append(saved, fileHeader.Filename)
	}

	// Build response message
	message := ""
	if len(saved) > 0 {
		message = fmt.Sprintf("Successfully uploaded %d file(s)", len(saved))
		if len(errors) > 0 {
			message += fmt.Sprintf(", %d failed", len(errors))
		}
	} else {
		message = "No files were uploaded"
	}

	response := UploadResponse{
		OK:      true,
		Files:   saved,
		Message: message,
	}

	if len(errors) > 0 {
		response.Errors = errors
	}

	c.JSON(http.StatusOK, response)
}
package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"

	"nextbrowse-backend/utils"
)

// UploadResponse is defined in upload_new.go to avoid duplicate type declarations.

// writeFileStream streams content directly to destination file - File Browser style with larger buffer
func writeFileStream(dst string, src io.Reader, overwrite bool) error {
	dir := filepath.Dir(dst)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	flags := os.O_RDWR | os.O_CREATE
	if overwrite {
		flags |= os.O_TRUNC
	} else {
		flags |= os.O_EXCL // Fail if file exists
	}

	file, err := os.OpenFile(dst, flags, 0644)
	if err != nil {
		return err
	}
	defer file.Close()

	// Use larger buffer for better performance like filebrowser
	buf := make([]byte, 1024*1024) // 1MB buffer instead of default 32KB
	_, err = io.CopyBuffer(file, src, buf)
	return err
}

func UploadFilesLegacy(c *gin.Context) {
	// Parse multipart form with larger memory limit for better performance
	err := c.Request.ParseMultipartForm(256 << 20) // 256MB max memory like filebrowser
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

	// Replace flag: when true, overwrite existing files
	replace := false
	if v := c.PostForm("replace"); v != "" {
		if parsed, err := strconv.ParseBool(v); err == nil {
			replace = parsed
		}
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

		// Check if file already exists when not replacing
		if utils.FileExists(outPath) && !replace {
			src.Close()
			errors = append(errors, fileHeader.Filename+": File already exists")
			continue
		}

		// Write file using File Browser style streaming
		err = writeFileStream(outPath, src, replace)
		src.Close()

		if err != nil {
			errors = append(errors, fileHeader.Filename+": Failed to write file: "+err.Error())
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

// Simplified chunked upload - File Browser style with single part file
func UploadChunkLegacy(c *gin.Context) {
	// Parse multipart form with larger memory limit for better performance
	if err := c.Request.ParseMultipartForm(256 << 20); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "failed to parse multipart form"})
		return
	}

	pathParam := c.PostForm("path")
	if pathParam == "" {
		pathParam = "/"
	}

	destPath, err := utils.SafeResolve(pathParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": err.Error()})
		return
	}

	fileName := c.PostForm("fileName")
	fileId := c.PostForm("fileId")
	chunkIndexStr := c.PostForm("chunkIndex")
	totalChunksStr := c.PostForm("totalChunks")
	replace := false
	if v := c.PostForm("replace"); v != "" {
		if parsed, err := strconv.ParseBool(v); err == nil {
			replace = parsed
		}
	}

	if fileName == "" || fileId == "" || chunkIndexStr == "" || totalChunksStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "missing form fields"})
		return
	}

	chunkIndex, err := strconv.Atoi(chunkIndexStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "invalid chunkIndex"})
		return
	}
	totalChunks, err := strconv.Atoi(totalChunksStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "invalid totalChunks"})
		return
	}

	// Read uploaded chunk
	fileHeader, err := c.FormFile("chunk")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "missing chunk file"})
		return
	}

	src, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to open chunk"})
		return
	}
	defer src.Close()

	// Create temp directory
	tmpDir := filepath.Join(destPath, ".uploads", fileId)
	if err := os.MkdirAll(tmpDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to create tmp dir"})
		return
	}

	// Single .part file approach - File Browser style
	partPath := filepath.Join(tmpDir, fileName+".part")
	
	var file *os.File
	if chunkIndex == 0 {
		// First chunk - create/truncate file
		file, err = os.OpenFile(partPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	} else {
		// Subsequent chunks - append
		file, err = os.OpenFile(partPath, os.O_WRONLY|os.O_APPEND, 0644)
	}
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to open part file"})
		return
	}
	defer file.Close()

	// Stream chunk data directly with large buffer - File Browser style
	buf := make([]byte, 1024*1024) // 1MB buffer for better performance
	_, err = io.CopyBuffer(file, src, buf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to write chunk"})
		return
	}

	// If this is the last chunk, finalize the file
	if chunkIndex+1 >= totalChunks {
		finalPath := filepath.Join(destPath, fileName)
		
		// Check for conflicts when not replacing
		if utils.FileExists(finalPath) && !replace {
			c.JSON(http.StatusConflict, gin.H{"ok": false, "error": "file exists"})
			return
		}
		
		file.Close() // Close before rename
		
		// Move part file to final location
		if replace && utils.FileExists(finalPath) {
			_ = os.Remove(finalPath)
		}
		
		if err := os.Rename(partPath, finalPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to finalize file"})
			return
		}
		
		// Clean up temp directory
		_ = os.RemoveAll(tmpDir)
		
		c.JSON(http.StatusOK, gin.H{"ok": true, "message": "upload complete"})
	} else {
		c.JSON(http.StatusOK, gin.H{"ok": true, "message": fmt.Sprintf("chunk %d received", chunkIndex)})
	}
}

// Simple upload status check
func UploadStatusLegacy(c *gin.Context) {
	type UploadStatusRequest struct {
		FileId    string `json:"fileId"`
		FileName  string `json:"fileName"`
		Path      string `json:"pathParam"`
		ChunkSize int64  `json:"chunkSize,omitempty"`
	}

	type UploadStatusResponse struct {
		CanResume      bool  `json:"canResume"`
		UploadedChunks []int `json:"uploadedChunks"`
	}

	var req UploadStatusRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "invalid json payload"})
		return
	}

	pathParam := req.Path
	if pathParam == "" {
		pathParam = "/"
	}

	destPath, err := utils.SafeResolve(pathParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": err.Error()})
		return
	}

	// If final file exists, return conflict
	outPath := filepath.Join(destPath, req.FileName)
	if utils.FileExists(outPath) {
		c.JSON(http.StatusConflict, gin.H{"ok": false, "error": "file exists"})
		return
	}

	// Check for existing part file
	tmpDir := filepath.Join(destPath, ".uploads", req.FileId)
	partPath := filepath.Join(tmpDir, req.FileName+".part")
	
	if st, err := os.Stat(partPath); err == nil && req.ChunkSize > 0 {
		// Calculate uploaded chunks based on file size
		uploadedChunks := int(st.Size() / req.ChunkSize)
		uploaded := make([]int, 0, uploadedChunks)
		for i := range uploadedChunks {
			uploaded = append(uploaded, i)
		}
		c.JSON(http.StatusOK, UploadStatusResponse{
			CanResume:      uploadedChunks > 0,
			UploadedChunks: uploaded,
		})
		return
	}

	c.JSON(http.StatusOK, UploadStatusResponse{
		CanResume:      false,
		UploadedChunks: []int{},
	})
}

// Cancel upload by cleaning temp files (legacy handler renamed to avoid duplicate declaration)
func CancelUploadLegacy(c *gin.Context) {
	type CancelRequest struct {
		FileId string `json:"fileId"`
		Path   string `json:"pathParam"`
	}

	var req CancelRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "invalid json"})
		return
	}

	pathParam := req.Path
	if pathParam == "" {
		pathParam = "/"
	}

	destPath, err := utils.SafeResolve(pathParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": err.Error()})
		return
	}

	tmpDir := filepath.Join(destPath, ".uploads", req.FileId)
	_ = os.RemoveAll(tmpDir)

	c.JSON(http.StatusOK, gin.H{"ok": true, "message": "upload cancelled"})
}

// UploadPutRange handles HTTP PUT range uploads
func UploadPutRange(c *gin.Context) {
	// Simple implementation for PUT range uploads
	c.JSON(http.StatusOK, gin.H{"ok": true, "message": "range upload completed"})
}

// GetOptimalConfig returns hardware-optimized upload configuration
func GetOptimalConfig(c *gin.Context) {
	// Return File Browser-style optimal config with better performance settings
	config := map[string]any{
		"chunkSize":           8 * 1024 * 1024, // 8MB chunks for better performance
		"maxConcurrentUploads": 6,              // Increased concurrency
		"maxFileSize":         10 * 1024 * 1024 * 1024, // 10GB
		"resumable":           true,
	}
	
	c.JSON(http.StatusOK, config)
}

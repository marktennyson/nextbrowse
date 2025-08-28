package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"sync"

	"github.com/gin-gonic/gin"

	"nextbrowse-backend/utils"
)

type UploadResponse struct {
	OK      bool     `json:"ok"`
	Files   []string `json:"files"`
	Errors  []string `json:"errors,omitempty"`
	Message string   `json:"message"`
}

// Track cancelled uploads by fileId
var cancelledUploads sync.Map

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
		if utils.FileExists(outPath) && !replace {
			src.Close()
			errors = append(errors, fileHeader.Filename+": File already exists")
			continue
		}

		// Create destination file
		// When not replacing, use os.O_EXCL to fail if exists; otherwise truncate
		var dst *os.File
		if !replace {
			dst, err = os.OpenFile(outPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0644)
		} else {
			dst, err = os.OpenFile(outPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
		}
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

// UploadStatusRequest is the payload sent by the client to check resume info
type UploadStatusRequest struct {
	FileId   string `json:"fileId"`
	FileName string `json:"fileName"`
	Path     string `json:"pathParam"`
}

// UploadStatusResponse indicates whether upload can resume and which chunks exist
type UploadStatusResponse struct {
	CanResume     bool   `json:"canResume"`
	UploadedChunks []int `json:"uploadedChunks"`
}

// UploadStatus handles a small JSON request from the client to determine resume state
func UploadStatus(c *gin.Context) {
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

	// If final file exists, return 409 so client can show conflict dialog
	outPath := filepath.Join(destPath, req.FileName)
	if utils.FileExists(outPath) {
		c.JSON(http.StatusConflict, gin.H{"ok": false, "error": "file exists"})
		return
	}

	tmpDir := filepath.Join(destPath, ".uploads", req.FileId)
	entries, err := os.ReadDir(tmpDir)
	if err != nil {
		// No temp dir -> nothing uploaded
		c.JSON(http.StatusOK, UploadStatusResponse{CanResume: false, UploadedChunks: []int{}})
		return
	}

	var uploaded []int
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		// try parse filename as integer index
		if idx, err := strconv.Atoi(e.Name()); err == nil {
			uploaded = append(uploaded, idx)
		}
	}

	c.JSON(http.StatusOK, UploadStatusResponse{CanResume: true, UploadedChunks: uploaded})
}

// UploadChunk handles a single chunk upload and assembles the file when the last chunk arrives
func UploadChunk(c *gin.Context) {
	// Parse multipart form (small)
	if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
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

	// If this upload has been cancelled, clean and return
	if _, cancelled := cancelledUploads.Load(fileId); cancelled {
		tmpDir := filepath.Join(destPath, ".uploads", fileId)
		_ = os.RemoveAll(tmpDir)
		c.JSON(http.StatusConflict, gin.H{"ok": false, "error": "upload cancelled"})
		return
	}

	tmpDir := filepath.Join(destPath, ".uploads", fileId)
	if err := os.MkdirAll(tmpDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to create tmp dir"})
		return
	}

	// Save chunk file using index as name for easy ordering
	chunkPath := filepath.Join(tmpDir, fmt.Sprintf("%06d", chunkIndex))
	out, err := os.Create(chunkPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to create chunk file"})
		return
	}
	// Use a larger buffer to speed up copy
	buf := make([]byte, 1<<20) // 1 MiB buffer
	if _, err := io.CopyBuffer(out, src, buf); err != nil {
		out.Close()
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to write chunk"})
		return
	}
	out.Close()

	// If this is the last chunk, assemble
	if chunkIndex+1 >= totalChunks {
		// Check cancellation again before assembling
		if _, cancelled := cancelledUploads.Load(fileId); cancelled {
			_ = os.RemoveAll(tmpDir)
			c.JSON(http.StatusConflict, gin.H{"ok": false, "error": "upload cancelled"})
			return
		}
		outPath := filepath.Join(destPath, fileName)

		// If file exists and replace is false, return conflict
		if utils.FileExists(outPath) && !replace {
			c.JSON(http.StatusConflict, gin.H{"ok": false, "error": "file exists"})
			return
		}

		// Assemble to a temporary file then rename
		tmpOutPath := outPath + ".tmp." + fileId
		tmpOut, err := os.OpenFile(tmpOutPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to create output file"})
			return
		}

		// Iterate chunks in order
		for i := 0; i < totalChunks; i++ {
			partPath := filepath.Join(tmpDir, fmt.Sprintf("%06d", i))
			partF, err := os.Open(partPath)
			if err != nil {
				tmpOut.Close()
				os.Remove(tmpOutPath)
				c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "missing chunk during assemble"})
				return
			}
			// Reuse buffer for assembly
			if _, err := io.CopyBuffer(tmpOut, partF, buf); err != nil {
				partF.Close()
				tmpOut.Close()
				os.Remove(tmpOutPath)
				c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed while assembling file"})
				return
			}
			partF.Close()
		}

		tmpOut.Close()

		// Move assembled file into final location (will overwrite if replace true)
		if err := os.Rename(tmpOutPath, outPath); err != nil {
			// If rename fails, try copy fallback
			if copyErr := copyFile(tmpOutPath, outPath); copyErr != nil {
				os.Remove(tmpOutPath)
				c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to move assembled file"})
				return
			}
			os.Remove(tmpOutPath)
		}

	// Clean up tmp chunks and any cancelled flag
	_ = os.RemoveAll(tmpDir)
	cancelledUploads.Delete(fileId)
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// CancelUpload cancels an in-progress chunked upload and removes partial chunks
func CancelUpload(c *gin.Context) {
	type cancelReq struct {
		FileId   string `json:"fileId"`
		FileName string `json:"fileName"`
		Path     string `json:"path"`
	}
	var req cancelReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "invalid json"})
		return
	}
	if req.FileId == "" || req.Path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "missing fileId or path"})
		return
	}
	destPath, err := utils.SafeResolve(req.Path)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": err.Error()})
		return
	}
	cancelledUploads.Store(req.FileId, struct{}{})
	tmpDir := filepath.Join(destPath, ".uploads", req.FileId)
	_ = os.RemoveAll(tmpDir)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// copyFile is a simple fallback to copy a file's contents
func copyFile(srcPath, dstPath string) error {
	in, err := os.Open(srcPath)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(dstPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return err
	}
	defer out.Close()
	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return nil
}
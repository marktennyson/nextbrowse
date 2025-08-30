package handlers

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

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
	// Optional: hint for chunk size and total chunks so we can compute resume state from a single .part file
	ChunkSize   int64 `json:"chunkSize,omitempty"`
	TotalChunks int   `json:"totalChunks,omitempty"`
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

	// Fast-path: if we have a single .part file, compute uploaded chunks based on its size
	partPath := filepath.Join(tmpDir, req.FileName+".part")
	if st, err := os.Stat(partPath); err == nil && st.Mode().IsRegular() && req.ChunkSize > 0 {
		// Calculate how many full chunks we have written
		n := int(st.Size() / req.ChunkSize)
		if req.TotalChunks > 0 && n > req.TotalChunks {
			n = req.TotalChunks
		}
		uploaded := make([]int, 0, n)
		for i := 0; i < n; i++ {
			uploaded = append(uploaded, i)
		}
		c.JSON(http.StatusOK, UploadStatusResponse{CanResume: n > 0, UploadedChunks: uploaded})
		return
	}

	// Backward compatible fallback: scan per-chunk files if they exist
	entries, err := os.ReadDir(tmpDir)
	if err != nil {
		c.JSON(http.StatusOK, UploadStatusResponse{CanResume: false, UploadedChunks: []int{}})
		return
	}
	var uploaded []int
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		if idx, err := strconv.Atoi(e.Name()); err == nil {
			uploaded = append(uploaded, idx)
		}
	}
	c.JSON(http.StatusOK, UploadStatusResponse{CanResume: len(uploaded) > 0, UploadedChunks: uploaded})
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
	chunkSizeStr := c.PostForm("chunkSize")
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
	var optChunkSize int64
	if chunkSizeStr != "" {
		if v, err := strconv.ParseInt(chunkSizeStr, 10, 64); err == nil && v > 0 {
			optChunkSize = v
		}
	}
	// Note: total file size may be provided by the client if needed, but is not required here

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

	// Stream chunk directly into a single partial file to avoid extra IO
	partPath := filepath.Join(tmpDir, fileName+".part")
	flags := os.O_CREATE | os.O_WRONLY
	// If this is the first chunk and we intend to replace, start with a truncated file
	if chunkIndex == 0 {
		flags = flags | os.O_TRUNC
	}
	partFile, err := os.OpenFile(partPath, flags, 0644)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to open partial file"})
		return
	}
	defer partFile.Close()

	// Compute offset. Prefer provided chunk size, otherwise infer from src size
	var offset int64
	if optChunkSize > 0 {
		offset = int64(chunkIndex) * optChunkSize
	} else {
		// Fallback: use current end of file for sequential writes
		if st, err := partFile.Stat(); err == nil {
			offset = st.Size()
		}
	}

	// Position write at the correct offset
	if _, err := partFile.Seek(offset, io.SeekStart); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to seek partial file"})
		return
	}

	// Much larger buffer for high-speed uploads
	buf := make([]byte, 16<<20) // 16 MiB buffer for better throughput
	if _, err := io.CopyBuffer(partFile, src, buf); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to write chunk"})
		return
	}

	// Optionally, try to update mtime to signal progress
	_ = os.Chtimes(partPath, time.Now(), time.Now())

	// Finalize if this is the last chunk
	if chunkIndex+1 >= totalChunks {
		// Cancellation check again
		if _, cancelled := cancelledUploads.Load(fileId); cancelled {
			_ = os.RemoveAll(tmpDir)
			c.JSON(http.StatusConflict, gin.H{"ok": false, "error": "upload cancelled"})
			return
		}

		finalPath := filepath.Join(destPath, fileName)
		if utils.FileExists(finalPath) && !replace {
			c.JSON(http.StatusConflict, gin.H{"ok": false, "error": "file exists"})
			return
		}

		// Close before rename on Windows-like FS (harmless on Linux)
		partFile.Close()

		// Move assembled file into final location (overwrite if replace is true)
		if err := os.Rename(partPath, finalPath); err != nil {
			// Fallback: copy and remove
			if copyErr := copyFile(partPath, finalPath); copyErr != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to move final file"})
				return
			}
			_ = os.Remove(partPath)
		}

		// Cleanup
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

// --- New: Raw PUT with Content-Range for faster chunked uploads ---

// parseContentRange parses "bytes start-end/total" and returns numbers.
// Returns error if header is invalid or incomplete for our purposes.
func parseContentRange(h string) (start, end, total int64, err error) {
	if h == "" {
		return 0, 0, 0, errors.New("missing Content-Range")
	}
	h = strings.TrimSpace(h)
	if !strings.HasPrefix(h, "bytes ") {
		return 0, 0, 0, errors.New("invalid unit in Content-Range")
	}
	spec := strings.TrimPrefix(h, "bytes ")
	parts := strings.Split(spec, "/")
	if len(parts) != 2 {
		return 0, 0, 0, errors.New("invalid Content-Range format")
	}
	rangePart := parts[0]
	totalPart := parts[1]

	if totalPart == "*" {
		return 0, 0, 0, errors.New("total size is required")
	}
	t, err := strconv.ParseInt(totalPart, 10, 64)
	if err != nil || t < 0 {
		return 0, 0, 0, errors.New("invalid total in Content-Range")
	}

	se := strings.Split(rangePart, "-")
	if len(se) != 2 {
		return 0, 0, 0, errors.New("invalid start-end in Content-Range")
	}
	s, err := strconv.ParseInt(se[0], 10, 64)
	if err != nil || s < 0 {
		return 0, 0, 0, errors.New("invalid start in Content-Range")
	}
	e, err := strconv.ParseInt(se[1], 10, 64)
	if err != nil || e < s {
		return 0, 0, 0, errors.New("invalid end in Content-Range")
	}

	return s, e, t, nil
}

// UploadPutRange streams the request body into a single .part file at the byte offset from Content-Range.
// On the last part (end+1 == total), it atomically moves the .part to the final destination.
func UploadPutRange(c *gin.Context) {
	// Required identifiers (as query params or headers)
	pathParam := c.Query("path")
	if pathParam == "" {
		pathParam = c.GetHeader("X-Path")
	}
	if pathParam == "" {
		pathParam = "/"
	}
	fileName := c.Query("fileName")
	if fileName == "" {
		fileName = c.GetHeader("X-File-Name")
	}
	fileId := c.Query("fileId")
	if fileId == "" {
		fileId = c.GetHeader("X-File-Id")
	}
	replace := false
	if v := c.Query("replace"); v != "" {
		if parsed, err := strconv.ParseBool(v); err == nil {
			replace = parsed
		}
	} else if v := c.GetHeader("X-Replace"); v != "" {
		if parsed, err := strconv.ParseBool(v); err == nil {
			replace = parsed
		}
	}

	if fileName == "" || fileId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "missing fileName or fileId"})
		return
	}

	// Parse Content-Range
	cr := c.GetHeader("Content-Range")
	start, end, total, err := parseContentRange(cr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": err.Error()})
		return
	}
	expectedLen := end - start + 1
	if c.Request.ContentLength > 0 && c.Request.ContentLength != expectedLen {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "content length mismatch"})
		return
	}

	// Resolve destination safely
	destPath, err := utils.SafeResolve(pathParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": err.Error()})
		return
	}
	if err := os.MkdirAll(destPath, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to create destination directory"})
		return
	}

	// Cancellation check
	if _, cancelled := cancelledUploads.Load(fileId); cancelled {
		tmpDir := filepath.Join(destPath, ".uploads", fileId)
		_ = os.RemoveAll(tmpDir)
		c.JSON(http.StatusConflict, gin.H{"ok": false, "error": "upload cancelled"})
		return
	}

	// Prevent accidental overwrite of final file when not replacing
	finalPath := filepath.Join(destPath, fileName)
	if utils.FileExists(finalPath) && !replace {
		c.JSON(http.StatusConflict, gin.H{"ok": false, "error": "file exists"})
		return
	}

	// Prepare temp dir and .part file
	tmpDir := filepath.Join(destPath, ".uploads", fileId)
	if err := os.MkdirAll(tmpDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to create tmp dir"})
		return
	}
	partPath := filepath.Join(tmpDir, fileName+".part")

	flags := os.O_CREATE | os.O_WRONLY
	// Only truncate when writing from the very beginning and we intend to replace
	if start == 0 && replace {
		flags |= os.O_TRUNC
	}
	partFile, err := os.OpenFile(partPath, flags, 0644)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to open partial file"})
		return
	}
	defer partFile.Close()

	// Seek to offset and stream body
	if _, err := partFile.Seek(start, io.SeekStart); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to seek partial file"})
		return
	}

	// Stream data with optimized buffer size
	buf := make([]byte, 32<<20) // 32 MiB buffer for high-speed streaming
	written, err := io.CopyBuffer(partFile, c.Request.Body, buf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to write chunk"})
		return
	}
	if written != expectedLen {
		c.JSON(http.StatusBadRequest, gin.H{"ok": false, "error": "unexpected bytes written"})
		return
	}

	_ = os.Chtimes(partPath, time.Now(), time.Now())

	// Finalize if this is the last range
	if end+1 == total {
		// Cancellation check again
		if _, cancelled := cancelledUploads.Load(fileId); cancelled {
			_ = os.RemoveAll(tmpDir)
			c.JSON(http.StatusConflict, gin.H{"ok": false, "error": "upload cancelled"})
			return
		}

		// Close before rename
		_ = partFile.Close()

		// If final exists and replace is true, remove it first to ensure atomic rename
		if utils.FileExists(finalPath) && replace {
			_ = os.Remove(finalPath)
		}

		if err := os.Rename(partPath, finalPath); err != nil {
			// Fallback: copy then remove
			if copyErr := copyFile(partPath, finalPath); copyErr != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": "failed to move final file"})
				return
			}
			_ = os.Remove(partPath)
		}

		_ = os.RemoveAll(tmpDir)
		cancelledUploads.Delete(fileId)
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}
package handlers

import (
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"

	"nextbrowse-backend/config"
	"nextbrowse-backend/models"
	"nextbrowse-backend/utils"
)

type CreateShareRequest struct {
	Path          string `json:"path"`
	Password      string `json:"password,omitempty"`
	ExpiresIn     *int64 `json:"expiresIn,omitempty"` // seconds
	AllowUploads  bool   `json:"allowUploads,omitempty"`
	DisableViewer bool   `json:"disableViewer,omitempty"`
	QuickDownload bool   `json:"quickDownload,omitempty"`
	MaxBandwidth  *int64 `json:"maxBandwidth,omitempty"`
	Title         string `json:"title,omitempty"`
	Description   string `json:"description,omitempty"`
	Theme         string `json:"theme,omitempty"`
	ViewMode      string `json:"viewMode,omitempty"`
}

type CreateShareResponse struct {
	OK       bool                  `json:"ok"`
	ShareID  string                `json:"shareId"`
	ShareURL string                `json:"shareUrl"`
	Share    *models.SharePublic   `json:"share"`
}

type GetSharesResponse struct {
	OK     bool                  `json:"ok"`
	Shares []*models.SharePublic `json:"shares"`
}

type AccessShareRequest struct {
	Password string `json:"password,omitempty"`
}

type AccessShareResponse struct {
	OK      bool   `json:"ok"`
	Valid   bool   `json:"valid"`
	Message string `json:"message,omitempty"`
}

func CreateShare(c *gin.Context) {
	var req CreateShareRequest
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
			"error": "Path is required",
		})
		return
	}

	// Safely resolve path
	safePath, err := utils.SafeResolve(req.Path)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Invalid path: " + err.Error(),
		})
		return
	}

	// Check if file/directory exists
	if !utils.FileExists(safePath) {
		c.JSON(http.StatusNotFound, gin.H{
			"ok":    false,
			"error": "File or directory not found",
		})
		return
	}

	// Get file info to determine type
	fileInfo, err := os.Stat(safePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"ok":    false,
			"error": "Failed to get file info",
		})
		return
	}

	// Generate share ID
	shareID, err := models.CreateShareID()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"ok":    false,
			"error": "Failed to generate share ID",
		})
		return
	}

	// Create share object
	now := time.Now().UnixMilli()
	share := &models.Share{
		ID:            shareID,
		Path:          safePath,
		Type:          "file",
		CreatedAt:     now,
		Password:      req.Password,
		AllowUploads:  req.AllowUploads,
		DisableViewer: req.DisableViewer,
		QuickDownload: req.QuickDownload,
		MaxBandwidth:  req.MaxBandwidth,
		Title:         req.Title,
		Description:   req.Description,
		Theme:         req.Theme,
		ViewMode:      req.ViewMode,
	}

	if fileInfo.IsDir() {
		share.Type = "dir"
	}

	// Set expiration if provided
	if req.ExpiresIn != nil && *req.ExpiresIn > 0 {
		expiresAt := now + (*req.ExpiresIn * 1000) // convert seconds to milliseconds
		share.ExpiresAt = &expiresAt
	}

	// Store share
	models.SetShare(share)

	// Build share URL
	shareURL := config.BaseURL + "/share/" + shareID

	response := CreateShareResponse{
		OK:       true,
		ShareID:  shareID,
		ShareURL: shareURL,
		Share:    share.ToPublic(),
	}

	c.JSON(http.StatusOK, response)
}

func GetShare(c *gin.Context) {
	shareID := c.Param("shareId")
	if shareID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Missing share ID",
		})
		return
	}

	// Get share
	share, exists := models.GetShare(shareID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"ok":    false,
			"error": "Share not found",
		})
		return
	}

	// Check if share has expired
	if share.ExpiresAt != nil && *share.ExpiresAt < time.Now().UnixMilli() {
		models.DeleteShare(shareID)
		c.JSON(http.StatusNotFound, gin.H{
			"ok":    false,
			"error": "Share has expired",
		})
		return
	}

	// Check if shared file/directory still exists
	if !utils.FileExists(share.Path) {
		models.DeleteShare(shareID)
		c.JSON(http.StatusNotFound, gin.H{
			"ok":    false,
			"error": "Shared file or directory no longer exists",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ok":    true,
		"share": share.ToPublic(),
	})
}

func AccessShare(c *gin.Context) {
	shareID := c.Param("shareId")
	if shareID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Missing share ID",
		})
		return
	}

	var req AccessShareRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Invalid request body",
		})
		return
	}

	// Get share
	share, exists := models.GetShare(shareID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"ok":    false,
			"error": "Share not found",
		})
		return
	}

	// Check if share has expired
	if share.ExpiresAt != nil && *share.ExpiresAt < time.Now().UnixMilli() {
		models.DeleteShare(shareID)
		c.JSON(http.StatusNotFound, gin.H{
			"ok":    false,
			"error": "Share has expired",
		})
		return
	}

	// Check password if required
	if share.Password != "" {
		if req.Password == "" {
			c.JSON(http.StatusOK, AccessShareResponse{
				OK:      true,
				Valid:   false,
				Message: "Password required",
			})
			return
		}

		if req.Password != share.Password {
			c.JSON(http.StatusOK, AccessShareResponse{
				OK:      true,
				Valid:   false,
				Message: "Invalid password",
			})
			return
		}
	}

	// Check if shared file/directory still exists
	if !utils.FileExists(share.Path) {
		models.DeleteShare(shareID)
		c.JSON(http.StatusNotFound, gin.H{
			"ok":    false,
			"error": "Shared file or directory no longer exists",
		})
		return
	}

	c.JSON(http.StatusOK, AccessShareResponse{
		OK:      true,
		Valid:   true,
		Message: "Access granted",
	})
}

func DownloadShare(c *gin.Context) {
	shareID := c.Param("shareId")
	if shareID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"ok":    false,
			"error": "Missing share ID",
		})
		return
	}

	// Get share
	share, exists := models.GetShare(shareID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"ok":    false,
			"error": "Share not found",
		})
		return
	}

	// Check if share has expired
	if share.ExpiresAt != nil && *share.ExpiresAt < time.Now().UnixMilli() {
		models.DeleteShare(shareID)
		c.JSON(http.StatusNotFound, gin.H{
			"ok":    false,
			"error": "Share has expired",
		})
		return
	}

	// Check if shared file/directory still exists
	if !utils.FileExists(share.Path) {
		models.DeleteShare(shareID)
		c.JSON(http.StatusNotFound, gin.H{
			"ok":    false,
			"error": "Shared file or directory no longer exists",
		})
		return
	}

	// TODO: Implement password check for download
	// For now, assuming access control is handled by frontend

	if share.Type == "file" {
		// Download single file
		c.File(share.Path)
	} else {
		// Download directory as ZIP
		// This is a simplified implementation
		// You might want to implement proper ZIP streaming here
		c.JSON(http.StatusNotImplemented, gin.H{
			"ok":    false,
			"error": "Directory download not yet implemented",
		})
	}
}

// GetAllShares returns all shares (for management)
func GetAllShares(c *gin.Context) {
	validShares := models.GetAllShares()
	var publicShares []*models.SharePublic
	
	for _, share := range validShares {
		publicShares = append(publicShares, share.ToPublic())
	}

	response := GetSharesResponse{
		OK:     true,
		Shares: publicShares,
	}

	c.JSON(http.StatusOK, response)
}
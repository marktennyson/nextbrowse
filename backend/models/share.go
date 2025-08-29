package models

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

type Share struct {
	ID            string `json:"id"`
	Path          string `json:"path"`
	Type          string `json:"type"` // "file" or "dir"
	CreatedAt     int64  `json:"createdAt"`
	ExpiresAt     *int64 `json:"expiresAt,omitempty"`
	Password      string `json:"password,omitempty"`
	AllowUploads  bool   `json:"allowUploads,omitempty"`
	DisableViewer bool   `json:"disableViewer,omitempty"`
	QuickDownload bool   `json:"quickDownload,omitempty"`
	MaxBandwidth  *int64 `json:"maxBandwidth,omitempty"`
	Title         string `json:"title,omitempty"`
	Description   string `json:"description,omitempty"`
	Theme         string `json:"theme,omitempty"`
	ViewMode      string `json:"viewMode,omitempty"` // "list" or "grid"
}

type SharePublic struct {
	ID            string `json:"id"`
	Type          string `json:"type"`
	CreatedAt     int64  `json:"createdAt"`
	ExpiresAt     *int64 `json:"expiresAt,omitempty"`
	HasPassword   bool   `json:"hasPassword"`
	AllowUploads  bool   `json:"allowUploads,omitempty"`
	DisableViewer bool   `json:"disableViewer,omitempty"`
	QuickDownload bool   `json:"quickDownload,omitempty"`
	Title         string `json:"title,omitempty"`
	Description   string `json:"description,omitempty"`
}

// In-memory storage for shares (replace with DB in production)
var (
	shares     = make(map[string]*Share)
	sharesMutex = sync.RWMutex{}
)

// CreateShareID generates a new unique share ID
func CreateShareID() (string, error) {
	bytes := make([]byte, 16)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// GetShare retrieves a share by ID
func GetShare(id string) (*Share, bool) {
	sharesMutex.RLock()
	defer sharesMutex.RUnlock()
	
	share, exists := shares[id]
	return share, exists
}

// SetShare stores a share
func SetShare(share *Share) {
	sharesMutex.Lock()
	defer sharesMutex.Unlock()
	
	shares[share.ID] = share
}

// DeleteShare removes a share
func DeleteShare(id string) {
	sharesMutex.Lock()
	defer sharesMutex.Unlock()
	
	delete(shares, id)
}

// GetAllShares returns all valid shares (cleaning up expired ones)
func GetAllShares() []*Share {
	sharesMutex.Lock()
	defer sharesMutex.Unlock()
	
	now := time.Now().UnixMilli()
	var validShares []*Share
	
	// Clean up expired shares and collect valid ones
	for id, share := range shares {
		if share.ExpiresAt != nil && *share.ExpiresAt < now {
			delete(shares, id)
		} else {
			validShares = append(validShares, share)
		}
	}
	
	return validShares
}

// ToPublic converts a Share to SharePublic (hiding sensitive data)
func (s *Share) ToPublic() *SharePublic {
	return &SharePublic{
		ID:            s.ID,
		Type:          s.Type,
		CreatedAt:     s.CreatedAt,
		ExpiresAt:     s.ExpiresAt,
		HasPassword:   s.Password != "",
		AllowUploads:  s.AllowUploads,
		DisableViewer: s.DisableViewer,
		QuickDownload: s.QuickDownload,
		Title:         s.Title,
		Description:   s.Description,
	}
}
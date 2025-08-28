package utils

import (
	"errors"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"nextbrowse-backend/config"
)

// SafeResolve safely resolves a user path within the root directory
func SafeResolve(userPath string) (string, error) {
	if userPath == "" {
		userPath = "/"
	}

	// Normalize the user path
	userPath = filepath.Clean("/" + strings.TrimPrefix(userPath, "/"))

	// Join with root directory
	fullPath := filepath.Join(config.RootDir, userPath)

	// Ensure the resolved path is still within the root directory
	absRoot, err := filepath.Abs(config.RootDir)
	if err != nil {
		return "", err
	}

	absPath, err := filepath.Abs(fullPath)
	if err != nil {
		return "", err
	}

	// Check if the path is within the root directory
	if !strings.HasPrefix(absPath+string(filepath.Separator), absRoot+string(filepath.Separator)) && absPath != absRoot {
		return "", errors.New("path traversal blocked")
	}

	return absPath, nil
}

// EncodePathForURL encodes a file system path for safe use in URLs
func EncodePathForURL(userPath string) string {
	if userPath == "" {
		userPath = "/"
	}

	parts := strings.Split(strings.Trim(userPath, "/"), "/")
	var encoded []string

	for _, part := range parts {
		if part != "" {
			encoded = append(encoded, url.PathEscape(part))
		}
	}

	return "/" + strings.Join(encoded, "/")
}

// BuildPublicFileURL builds a public URL for a given user path
func BuildPublicFileURL(userPath string) string {
	return config.PublicFilesBase + EncodePathForURL(userPath)
}

// FileExists checks if a file or directory exists
func FileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// IsDirectory checks if the path is a directory
func IsDirectory(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return info.IsDir()
}
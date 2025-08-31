package config

import (
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

var (
	RootDir         string
	PublicFilesBase string
	BaseURL         string
	MaxFileSize     int64  // Max file size in bytes
	MaxUploadSize   int64  // Max total upload size in bytes
	AllowedOrigins  []string
	Environment     string
)

func init() {
	loadConfig()
}

func loadConfig() {
	// Environment
	Environment = getEnvWithDefault("ENVIRONMENT", "development")
	if Environment == "production" {
		os.Setenv("GIN_MODE", "release")
	}

	// Get root directory from environment
	RootDir = os.Getenv("ROOT_PATH")
	if RootDir == "" {
		RootDir = os.Getenv("ROOT_DIR")
	}
	if RootDir == "" {
		RootDir = "/app/static"
	}

	// Clean and normalize path
	RootDir = filepath.Clean(RootDir)

	// Public files base path
	PublicFilesBase = "/files"

	// Base URL for shares
	BaseURL = os.Getenv("NEXT_PUBLIC_BASE_URL")
	if BaseURL == "" {
		BaseURL = "http://localhost:3000"
	}

	// File size limits (default: 10GB max file, 50GB max upload)
	MaxFileSize = parseSize(getEnvWithDefault("MAX_FILE_SIZE", "10737418240"))     // 10GB
	MaxUploadSize = parseSize(getEnvWithDefault("MAX_UPLOAD_SIZE", "53687091200")) // 50GB

	// Allowed origins for CORS
	originsEnv := getEnvWithDefault("ALLOWED_ORIGINS", "*")
	if originsEnv == "*" {
		AllowedOrigins = []string{"*"}
	} else {
		AllowedOrigins = strings.Split(originsEnv, ",")
		for i, origin := range AllowedOrigins {
			AllowedOrigins[i] = strings.TrimSpace(origin)
		}
	}
}

// ValidateConfig validates the configuration
func ValidateConfig() error {
	// Check if root directory exists
	if _, err := os.Stat(RootDir); os.IsNotExist(err) {
		return errors.New("root directory does not exist: " + RootDir)
	}

	// Check if root directory is accessible
	if !isDirectoryAccessible(RootDir) {
		return errors.New("root directory is not accessible: " + RootDir)
	}

	// Validate file size limits
	if MaxFileSize <= 0 {
		return errors.New("MAX_FILE_SIZE must be greater than 0")
	}

	if MaxUploadSize <= 0 {
		return errors.New("MAX_UPLOAD_SIZE must be greater than 0")
	}

	// Validate base URL format
	if !strings.HasPrefix(BaseURL, "http://") && !strings.HasPrefix(BaseURL, "https://") {
		return errors.New("NEXT_PUBLIC_BASE_URL must start with http:// or https://")
	}

	return nil
}

// Helper functions
func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func parseSize(sizeStr string) int64 {
	size, err := strconv.ParseInt(sizeStr, 10, 64)
	if err != nil {
		return 10737418240 // 10GB default
	}
	return size
}

func isDirectoryAccessible(path string) bool {
	// Try to read directory
	_, err := os.ReadDir(path)
	return err == nil
}

// IsProduction returns true if running in production environment
func IsProduction() bool {
	return Environment == "production"
}

// IsDevelopment returns true if running in development environment
func IsDevelopment() bool {
	return Environment == "development"
}
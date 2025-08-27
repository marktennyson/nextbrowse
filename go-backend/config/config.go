package config

import (
	"os"
	"path/filepath"
)

var (
	RootDir         string
	PublicFilesBase string
	BaseURL         string
)

func init() {
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
}
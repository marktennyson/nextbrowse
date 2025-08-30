#!/bin/bash

# Cross-platform build script for NextBrowse Go backend
# This script builds binaries for multiple platforms

set -e

echo "Building NextBrowse backend for multiple platforms..."

# Ensure we're in the backend directory
cd "$(dirname "$0")"

# Clean up any existing binaries
rm -f nextbrowse-backend*

# Build for Linux (Docker/production)
echo "🐧 Building for Linux (Docker)..."
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o nextbrowse-backend .

# Build for macOS (development)
echo "🍎 Building for macOS..."
CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -o nextbrowse-backend-macos .

# Build for Windows (if needed)
echo "🪟 Building for Windows..."
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -o nextbrowse-backend-windows.exe .

# Make binaries executable
chmod +x nextbrowse-backend*

echo ""
echo "✅ Built all binaries successfully!"
echo "📦 Binary sizes:"
ls -lh nextbrowse-backend*
echo ""
echo "Files built:"
echo "  - nextbrowse-backend (Linux - for Docker)"
echo "  - nextbrowse-backend-macos (macOS - for local development)"
echo "  - nextbrowse-backend-windows.exe (Windows)"
echo ""
echo "The Linux binary (nextbrowse-backend) is ready for Docker."

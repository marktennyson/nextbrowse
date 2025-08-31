#!/bin/bash

# Build script for NextBrowse Go backend
# This script builds the Go binary for Linux (Docker container)

set -e

echo "Building NextBrowse backend for Linux..."

# Ensure we're in the backend directory
cd "$(dirname "$0")"

# Clean up any existing binary
rm -f nextbrowse-backend

# Build for Linux (Docker container target)
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o nextbrowse-backend .

# Make the binary executable
chmod +x nextbrowse-backend

echo "✅ Built nextbrowse-backend successfully!"
echo "📦 Binary size: $(du -h nextbrowse-backend | cut -f1)"
echo ""
echo "The binary is ready to be used by Docker."
echo "You can now run 'docker-compose up' from the project root."

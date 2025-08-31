#!/bin/bash

# Script to start the Go backend for development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting NextBrowse Go Backend${NC}"

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo -e "${RED}❌ Go is not installed. Please install Go 1.22 or later.${NC}"
    exit 1
fi

# Set default environment variables if not set
export ROOT_PATH=${ROOT_PATH:-"/tmp/nextbrowse-test"}
export PORT=${PORT:-"9932"}
export NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL:-"http://localhost:3000"}

# Create test directory if it doesn't exist
if [ ! -d "$ROOT_PATH" ]; then
    echo -e "${YELLOW}📁 Creating test directory: $ROOT_PATH${NC}"
    mkdir -p "$ROOT_PATH"
    
    # Add some test files
    echo "Hello from NextBrowse!" > "$ROOT_PATH/test-file.txt"
    mkdir -p "$ROOT_PATH/test-directory"
    echo "This is a test file in a subdirectory" > "$ROOT_PATH/test-directory/nested-file.txt"
fi

echo -e "${GREEN}📍 Environment Configuration:${NC}"
echo -e "   ROOT_PATH: $ROOT_PATH"
echo -e "   PORT: $PORT"
echo -e "   BASE_URL: $NEXT_PUBLIC_BASE_URL"

# Navigate to Go backend directory
cd backend

# Download dependencies
echo -e "${YELLOW}📦 Downloading Go dependencies...${NC}"
go mod download

# Build and run the application
echo -e "${YELLOW}🔨 Building and starting Go backend...${NC}"
go run main.go

echo -e "${GREEN}✅ Go backend started successfully!${NC}"
echo -e "${GREEN}🌐 API available at: http://localhost:$PORT${NC}"
echo -e "${GREEN}🏥 Health check: http://localhost:$PORT/health${NC}"
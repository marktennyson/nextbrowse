#!/bin/bash

# Docker Image Loader Script
# Loads Docker images from RAR archives in the production-ready branch

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    local level="$1"
    shift
    case "$level" in
        INFO)  echo -e "${BLUE}[INFO]${NC} $*" ;;
        WARN)  echo -e "${YELLOW}[WARN]${NC} $*" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} $*" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} $*" ;;
    esac
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR="$PROJECT_ROOT/assets"

# Default values
FORCE_LOAD=false
SPECIFIC_ARCH=""

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --force             Force reload images even if they exist"
    echo "  --arch ARCH         Load images for specific architecture (amd64, arm64)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  Load images for current architecture"
    echo "  $0 --arch arm64     Load ARM64 images specifically"
    echo "  $0 --force          Force reload all images"
}

detect_architecture() {
    case "$(uname -m)" in
        x86_64) echo "amd64" ;;
        aarch64|arm64) echo "arm64" ;;
        *) echo "amd64" ;; # default fallback
    esac
}

check_dependencies() {
    local deps=("docker" "unrar")
    local missing=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing+=("$dep")
        fi
    done
    
    if [ ${#missing[@]} -ne 0 ]; then
        log ERROR "Missing dependencies: ${missing[*]}"
        exit 1
    fi
}

load_docker_images() {
    log INFO "Loading Docker images from RAR archives..."
    
    if [ ! -f "$ASSETS_DIR/docker-images.rar" ]; then
        log ERROR "Docker images archive not found: $ASSETS_DIR/docker-images.rar"
        log ERROR "Make sure you're on the production-ready branch with built assets"
        exit 1
    fi
    
    # Determine architecture
    local arch="$SPECIFIC_ARCH"
    if [ -z "$arch" ]; then
        arch=$(detect_architecture)
    fi
    
    log INFO "Loading images for $arch architecture..."
    
    # Create temporary directory
    local temp_dir
    temp_dir=$(mktemp -d)
    
    # Extract archives
    log INFO "Extracting Docker images archive..."
    unrar x -o+ "$ASSETS_DIR/docker-images.rar" "$temp_dir/"
    
    # Load backend image
    local backend_image="$temp_dir/nextbrowse-backend-${arch}.tar.gz"
    if [ -f "$backend_image" ]; then
        if [ "$FORCE_LOAD" = true ] || ! docker images | grep -q "nextbrowse-backend.*$arch"; then
            log INFO "Loading backend image for $arch..."
            docker load < "$backend_image"
            log SUCCESS "Backend image loaded"
        else
            log INFO "Backend image for $arch already exists (use --force to reload)"
        fi
    else
        log WARN "Backend image not found for $arch architecture"
    fi
    
    # Load frontend image
    local frontend_image="$temp_dir/nextbrowse-frontend-${arch}.tar.gz"
    if [ -f "$frontend_image" ]; then
        if [ "$FORCE_LOAD" = true ] || ! docker images | grep -q "nextbrowse-frontend.*$arch"; then
            log INFO "Loading frontend image for $arch..."
            docker load < "$frontend_image"
            log SUCCESS "Frontend image loaded"
        else
            log INFO "Frontend image for $arch already exists (use --force to reload)"
        fi
    else
        log WARN "Frontend image not found for $arch architecture"
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
    
    log SUCCESS "Docker image loading completed"
    
    # Show loaded images
    log INFO "NextBrowse Docker images:"
    docker images | grep nextbrowse || log WARN "No NextBrowse images found"
}

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                FORCE_LOAD=true
                shift
                ;;
            --arch)
                SPECIFIC_ARCH="$2"
                shift 2
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log ERROR "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    log INFO "🐳 NextBrowse Docker Image Loader"
    log INFO "=================================="
    
    # Check dependencies
    check_dependencies
    
    # Load images
    load_docker_images
    
    log SUCCESS "🎉 Docker images ready for deployment!"
}

# Run main function
main "$@"

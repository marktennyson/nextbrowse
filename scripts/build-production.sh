#!/bin/bash

# Production Build Pipeline for NextBrowse
# Builds multi-architecture Docker images and creates RAR archives for deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_ROOT/build"
ASSETS_DIR="$PROJECT_ROOT/assets"
DOCKER_BUILDX_CONTEXT="nextbrowse-builder"

# Supported architectures
ARCHITECTURES=("linux/amd64" "linux/arm64")
ARCH_SUFFIXES=("amd64" "arm64")

# Default values
PUSH_TO_PRODUCTION=false
BUILD_ALL_PLATFORMS=false
COMPRESS_ASSETS=true
VERBOSE=false

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --all                Build for all platforms (${ARCHITECTURES[*]})"
    echo "  --push              Create production-ready branch with assets"
    echo "  --no-compress       Skip asset compression"
    echo "  --verbose           Enable verbose output"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  Build for current platform only"
    echo "  $0 --all            Build for all platforms"
    echo "  $0 --all --push     Build all platforms and create production branch"
}

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

check_dependencies() {
    local deps=("docker" "rar" "git")
    local missing=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing+=("$dep")
        fi
    done
    
    if [ ${#missing[@]} -ne 0 ]; then
        log ERROR "Missing dependencies: ${missing[*]}"
        log INFO "Please install missing dependencies:"
        for dep in "${missing[@]}"; do
            case "$dep" in
                "rar") echo "  brew install rar" ;;
                "docker") echo "  https://docs.docker.com/get-docker/" ;;
                "git") echo "  https://git-scm.com/downloads" ;;
            esac
        done
        exit 1
    fi
}

setup_buildx() {
    log INFO "Setting up Docker Buildx for multi-platform builds..."
    
    # Create builder if it doesn't exist
    if ! docker buildx inspect "$DOCKER_BUILDX_CONTEXT" &>/dev/null; then
        docker buildx create --name "$DOCKER_BUILDX_CONTEXT" --use
    else
        docker buildx use "$DOCKER_BUILDX_CONTEXT"
    fi
    
    # Bootstrap the builder
    docker buildx inspect --bootstrap
}

build_go_binaries() {
    log INFO "Building Go binaries for all architectures..."
    
    cd "$PROJECT_ROOT/backend"
    
    # Clean existing binaries
    rm -f nextbrowse-backend-*
    
    for i in "${!ARCHITECTURES[@]}"; do
        local arch="${ARCHITECTURES[$i]}"
        local suffix="${ARCH_SUFFIXES[$i]}"
        local goos="${arch%/*}"
        local goarch="${arch#*/}"
        
        log INFO "Building Go binary for $arch..."
        
        CGO_ENABLED=0 GOOS="$goos" GOARCH="$goarch" go build \
            -ldflags='-w -s -extldflags "-static"' \
            -a -installsuffix cgo \
            -tags netgo,osusergo \
            -o "nextbrowse-backend-${goos}-${suffix}" \
            .
            
        chmod +x "nextbrowse-backend-${goos}-${suffix}"
        
        log SUCCESS "Built nextbrowse-backend-${goos}-${suffix} ($(du -h "nextbrowse-backend-${goos}-${suffix}" | cut -f1))"
    done
    
    cd "$PROJECT_ROOT"
}

build_frontend() {
    log INFO "Building Next.js frontend..."
    
    cd "$PROJECT_ROOT/frontend"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log INFO "Installing frontend dependencies..."
        npm ci
    fi
    
    # Build with standalone output
    log INFO "Building production frontend..."
    npm run build
    
    log SUCCESS "Frontend build completed"
    
    cd "$PROJECT_ROOT"
}

build_docker_images() {
    local platforms=()
    
    if [ "$BUILD_ALL_PLATFORMS" = true ]; then
        platforms=("${ARCHITECTURES[@]}")
        log INFO "Building Docker images for all platforms: ${platforms[*]}"
    else
        # Detect current platform
        local current_arch
        case "$(uname -m)" in
            x86_64) current_arch="linux/amd64" ;;
            aarch64|arm64) current_arch="linux/arm64" ;;
            *) current_arch="linux/amd64" ;; # default fallback
        esac
        platforms=("$current_arch")
        log INFO "Building Docker images for current platform: $current_arch"
    fi
    
    # Create build directory
    mkdir -p "$BUILD_DIR"
    
    # Build backend images
    log INFO "Building backend Docker images..."
    for platform in "${platforms[@]}"; do
        local suffix="${platform##*/}"
        local image_name="nextbrowse-backend:${suffix}"
        
        log INFO "Building $image_name for $platform..."
        
        docker buildx build \
            --platform "$platform" \
            --tag "$image_name" \
            --load \
            "$PROJECT_ROOT/backend"
            
        # Save image to tar
        docker save "$image_name" | gzip > "$BUILD_DIR/nextbrowse-backend-${suffix}.tar.gz"
        
        log SUCCESS "Saved $image_name to nextbrowse-backend-${suffix}.tar.gz"
    done
    
    # Build frontend images
    log INFO "Building frontend Docker images..."
    for platform in "${platforms[@]}"; do
        local suffix="${platform##*/}"
        local image_name="nextbrowse-frontend:${suffix}"
        
        log INFO "Building $image_name for $platform..."
        
        docker buildx build \
            --platform "$platform" \
            --tag "$image_name" \
            --load \
            "$PROJECT_ROOT/frontend"
            
        # Save image to tar
        docker save "$image_name" | gzip > "$BUILD_DIR/nextbrowse-frontend-${suffix}.tar.gz"
        
        log SUCCESS "Saved $image_name to nextbrowse-frontend-${suffix}.tar.gz"
    done
}

compress_assets() {
    if [ "$COMPRESS_ASSETS" = false ]; then
        log INFO "Skipping asset compression"
        return
    fi
    
    log INFO "Compressing build assets..."
    
    mkdir -p "$ASSETS_DIR"
    
    # Compress Docker images
    if [ -d "$BUILD_DIR" ] && [ "$(ls -A "$BUILD_DIR")" ]; then
        log INFO "Creating Docker images archive..."
        rar a -ep1 -r "$ASSETS_DIR/docker-images.rar" "$BUILD_DIR/"*.tar.gz
        log SUCCESS "Created docker-images.rar ($(du -h "$ASSETS_DIR/docker-images.rar" | cut -f1))"
    fi
    
    # Compress Go binaries
    if ls "$PROJECT_ROOT/backend/nextbrowse-backend-"* &>/dev/null; then
        log INFO "Creating Go binaries archive..."
        rar a -ep1 "$ASSETS_DIR/go-binaries.rar" "$PROJECT_ROOT/backend/nextbrowse-backend-"*
        log SUCCESS "Created go-binaries.rar ($(du -h "$ASSETS_DIR/go-binaries.rar" | cut -f1))"
    fi
    
    # Compress Next.js build
    if [ -d "$PROJECT_ROOT/frontend/.next" ]; then
        log INFO "Creating Next.js build archive..."
        cd "$PROJECT_ROOT/frontend"
        rar a -ep1 -r "$ASSETS_DIR/nextjs-build.rar" .next/
        cd "$PROJECT_ROOT"
        log SUCCESS "Created nextjs-build.rar ($(du -h "$ASSETS_DIR/nextjs-build.rar" | cut -f1))"
    fi
    
    # Create metadata file
    cat > "$ASSETS_DIR/build-info.json" << EOF
{
    "build_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "git_commit": "$(git rev-parse HEAD)",
    "git_branch": "$(git branch --show-current)",
    "architectures": $(printf '%s\n' "${ARCHITECTURES[@]}" | jq -R . | jq -s .),
    "docker_images": {
        "backend": $(ls "$BUILD_DIR"/nextbrowse-backend-*.tar.gz 2>/dev/null | xargs -n1 basename | jq -R . | jq -s . || echo "[]"),
        "frontend": $(ls "$BUILD_DIR"/nextbrowse-frontend-*.tar.gz 2>/dev/null | xargs -n1 basename | jq -R . | jq -s . || echo "[]")
    }
}
EOF
    
    log SUCCESS "Created build metadata: build-info.json"
}

create_production_branch() {
    if [ "$PUSH_TO_PRODUCTION" = false ]; then
        return
    fi
    
    log INFO "Creating production-ready branch..."
    
    # Check if we have a clean working directory
    if ! git diff-index --quiet HEAD --; then
        log WARN "Working directory is not clean. Stashing changes..."
        git stash push -m "Auto-stash before production build"
    fi
    
    # Current branch
    local current_branch
    current_branch=$(git branch --show-current)
    
    # Create or switch to production-ready branch
    if git show-ref --verify --quiet refs/heads/production-ready; then
        git checkout production-ready
        git merge "$current_branch" --no-edit
    else
        git checkout -b production-ready
    fi
    
    # Copy assets to production branch
    if [ -d "$ASSETS_DIR" ]; then
        git add "$ASSETS_DIR/"
        git commit -m "Add production build assets for $(date +"%Y-%m-%d %H:%M:%S")" || true
    fi
    
    # Switch back to original branch
    git checkout "$current_branch"
    
    log SUCCESS "Production-ready branch updated with build assets"
}

cleanup() {
    log INFO "Cleaning up temporary files..."
    
    # Remove build directory
    rm -rf "$BUILD_DIR"
    
    # Remove Docker images from local registry (optional)
    if [ "$VERBOSE" = false ]; then
        docker images | grep nextbrowse | awk '{print $3}' | xargs -r docker rmi &>/dev/null || true
    fi
}

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --all)
                BUILD_ALL_PLATFORMS=true
                shift
                ;;
            --push)
                PUSH_TO_PRODUCTION=true
                shift
                ;;
            --no-compress)
                COMPRESS_ASSETS=false
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
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
    
    log INFO "🚀 Starting NextBrowse Production Build Pipeline"
    log INFO "=============================================="
    
    # Check dependencies
    check_dependencies
    
    # Setup Docker Buildx for multi-platform builds
    if [ "$BUILD_ALL_PLATFORMS" = true ]; then
        setup_buildx
    fi
    
    # Build components
    build_go_binaries
    build_frontend
    build_docker_images
    
    # Compress assets
    compress_assets
    
    # Create production branch if requested
    create_production_branch
    
    # Cleanup
    if [ "$VERBOSE" = false ]; then
        cleanup
    fi
    
    log SUCCESS "🎉 Production build pipeline completed successfully!"
    
    if [ -d "$ASSETS_DIR" ]; then
        log INFO "📦 Build artifacts available in: $ASSETS_DIR"
        ls -la "$ASSETS_DIR"
    fi
}

# Run main function
main "$@"

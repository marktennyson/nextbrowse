#!/bin/bash

# Production Deployment Script for NextBrowse
# Deploys NextBrowse from pre-built RAR assets

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
ASSETS_DIR="$PROJECT_ROOT/assets"
DATA_DIR="$PROJECT_ROOT/data"

# Default values
ROOT_PATH=""
PORT="2929"
EXTRACT_ASSETS=true
START_SERVICES=true
FORCE_REBUILD=false

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --root-path PATH    Path to files to browse (required)"
    echo "  --port PORT         Port to run NextBrowse on (default: 2929)"
    echo "  --no-extract        Skip asset extraction"
    echo "  --no-start          Skip starting services"
    echo "  --force-rebuild     Force rebuild of all images"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --root-path /path/to/files"
    echo "  $0 --root-path /home/user/documents --port 3000"
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
    local deps=("docker" "unrar" "docker-compose")
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
                "unrar") echo "  brew install unrar" ;;
                "docker") echo "  https://docs.docker.com/get-docker/" ;;
                "docker-compose") echo "  https://docs.docker.com/compose/install/" ;;
            esac
        done
        exit 1
    fi
}

detect_architecture() {
    case "$(uname -m)" in
        x86_64) echo "amd64" ;;
        aarch64|arm64) echo "arm64" ;;
        *) echo "amd64" ;; # default fallback
    esac
}

extract_assets() {
    if [ "$EXTRACT_ASSETS" = false ]; then
        log INFO "Skipping asset extraction"
        return
    fi
    
    log INFO "Extracting production assets..."
    
    if [ ! -d "$ASSETS_DIR" ]; then
        log ERROR "Assets directory not found: $ASSETS_DIR"
        log ERROR "Make sure you're running this from the production-ready branch"
        exit 1
    fi
    
    # Extract Go binaries
    if [ -f "$ASSETS_DIR/go-binaries.rar" ]; then
        log INFO "Extracting Go binaries..."
        unrar x -o+ "$ASSETS_DIR/go-binaries.rar" "$PROJECT_ROOT/backend/"
        log SUCCESS "Go binaries extracted"
    fi
    
    # Extract Next.js build
    if [ -f "$ASSETS_DIR/nextjs-build.rar" ]; then
        log INFO "Extracting Next.js build..."
        cd "$PROJECT_ROOT/frontend"
        unrar x -o+ "$ASSETS_DIR/nextjs-build.rar" .
        cd "$PROJECT_ROOT"
        log SUCCESS "Next.js build extracted"
    fi
    
    # Extract Docker images
    if [ -f "$ASSETS_DIR/docker-images.rar" ]; then
        log INFO "Extracting Docker images..."
        local temp_dir
        temp_dir=$(mktemp -d)
        unrar x -o+ "$ASSETS_DIR/docker-images.rar" "$temp_dir/"
        
        # Load images based on current architecture
        local arch
        arch=$(detect_architecture)
        
        log INFO "Loading Docker images for $arch architecture..."
        
        if [ -f "$temp_dir/nextbrowse-backend-${arch}.tar.gz" ]; then
            log INFO "Loading backend image..."
            docker load < "$temp_dir/nextbrowse-backend-${arch}.tar.gz"
        fi
        
        if [ -f "$temp_dir/nextbrowse-frontend-${arch}.tar.gz" ]; then
            log INFO "Loading frontend image..."
            docker load < "$temp_dir/nextbrowse-frontend-${arch}.tar.gz"
        fi
        
        # Cleanup
        rm -rf "$temp_dir"
        
        log SUCCESS "Docker images loaded"
    fi
}

create_env_file() {
    log INFO "Creating .env configuration..."
    
    cat > "$PROJECT_ROOT/.env" << EOF
# NextBrowse Configuration
ROOT_PATH=$ROOT_PATH
PORT=$PORT
NEXT_PUBLIC_BASE_URL=http://localhost:$PORT

# Optional settings
MAX_FILE_SIZE=10737418240
MAX_UPLOAD_SIZE=53687091200
ALLOWED_ORIGINS=*
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
GIN_MODE=release
EOF
    
    log SUCCESS "Environment configuration created"
}

validate_root_path() {
    if [ -z "$ROOT_PATH" ]; then
        log ERROR "Root path is required. Use --root-path option."
        usage
        exit 1
    fi
    
    if [ ! -d "$ROOT_PATH" ]; then
        log ERROR "Root path does not exist: $ROOT_PATH"
        exit 1
    fi
    
    if [ ! -r "$ROOT_PATH" ]; then
        log ERROR "Root path is not readable: $ROOT_PATH"
        exit 1
    fi
    
    # Convert to absolute path
    ROOT_PATH=$(cd "$ROOT_PATH" && pwd)
    log INFO "Using root path: $ROOT_PATH"
}

create_data_directory() {
    if [ ! -d "$DATA_DIR" ]; then
        mkdir -p "$DATA_DIR"
        log INFO "Created data directory: $DATA_DIR"
    fi
}

start_services() {
    if [ "$START_SERVICES" = false ]; then
        log INFO "Skipping service startup"
        return
    fi
    
    log INFO "Starting NextBrowse services..."
    
    # Stop any existing services
    docker-compose down 2>/dev/null || true
    
    # Choose the appropriate docker-compose file
    local compose_file="docker-compose.prebuilt.yml"
    if [ ! -f "$PROJECT_ROOT/$compose_file" ]; then
        compose_file="docker-compose.yml"
    fi
    
    # Start services
    if [ "$FORCE_REBUILD" = true ]; then
        docker-compose -f "$compose_file" up --build -d
    else
        docker-compose -f "$compose_file" up -d
    fi
    
    log SUCCESS "NextBrowse services started"
    
    # Wait for services to be ready
    log INFO "Waiting for services to be ready..."
    sleep 5
    
    # Check service health
    if docker-compose -f "$compose_file" ps | grep -q "Up"; then
        log SUCCESS "✅ NextBrowse is running!"
        log INFO "📱 Access NextBrowse at: http://localhost:$PORT"
        log INFO "🔧 Backend API at: http://localhost:$PORT/api"
        log INFO "📁 Browsing files from: $ROOT_PATH"
        
        # Show running containers
        echo ""
        log INFO "Running services:"
        docker-compose -f "$compose_file" ps
    else
        log ERROR "❌ Some services failed to start"
        log INFO "Check logs with: docker-compose logs"
        exit 1
    fi
}

show_logs() {
    log INFO "Recent service logs:"
    docker-compose logs --tail=20
}

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --root-path)
                ROOT_PATH="$2"
                shift 2
                ;;
            --port)
                PORT="$2"
                shift 2
                ;;
            --no-extract)
                EXTRACT_ASSETS=false
                shift
                ;;
            --no-start)
                START_SERVICES=false
                shift
                ;;
            --force-rebuild)
                FORCE_REBUILD=true
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
    
    log INFO "🚀 NextBrowse Production Deployment"
    log INFO "===================================="
    
    # Validate inputs
    validate_root_path
    
    # Check dependencies
    check_dependencies
    
    # Create data directory
    create_data_directory
    
    # Extract assets
    extract_assets
    
    # Create environment configuration
    create_env_file
    
    # Start services
    start_services
    
    log SUCCESS "🎉 NextBrowse deployment completed successfully!"
}

# Handle script interruption
trap 'log ERROR "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"

#!/bin/bash

# NextBrowse Installation Script
# Automatically sets up and starts NextBrowse File Browser with Docker

set -e  # Exit on any error

echo "🚀 NextBrowse Installation Script"
echo "=================================="
echo ""

# Color codes for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Docker is installed
echo "🔍 Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    echo ""
    echo "Please install Docker first:"
    echo "  macOS/Windows: https://www.docker.com/products/docker-desktop"
    echo "  Linux: https://docs.docker.com/engine/install/"
    exit 1
fi
print_success "Docker is installed"

# Check if Docker Compose is available
if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not available!"
    echo ""
    echo "Please install Docker Compose:"
    echo "  https://docs.docker.com/compose/install/"
    exit 1
fi
print_success "Docker Compose is available"

# Check if Docker daemon is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker daemon is not running!"
    echo ""
    echo "Please start Docker and try again."
    exit 1
fi
print_success "Docker daemon is running"

echo ""

# Setup environment file
if [ ! -f .env ]; then
    print_info "Creating environment configuration..."
    if [ -f .env.example ]; then
        cp .env.example .env
        print_success "Created .env from template"
    else
        # Create a basic .env file if .env.example doesn't exist
        cat > .env << EOF
# NextBrowse Docker Environment Configuration

# Root directory on your local machine to browse (REQUIRED)
ROOT_PATH=/path/to/your/local/directory

# Port to run the application on (optional, defaults to 2929)
PORT=2929

# Optional: Custom domain/host (defaults to localhost)
# HOST=localhost
EOF
        print_success "Created .env file"
    fi
else
    print_info ".env file already exists"
fi

# Check and configure ROOT_PATH
source .env

if [ -z "$ROOT_PATH" ] || [ "$ROOT_PATH" = "/path/to/your/local/directory" ]; then
    echo ""
    print_warning "ROOT_PATH needs to be configured!"
    echo ""
    echo "Please choose a directory to browse with NextBrowse:"
    echo "Examples:"
    echo "  🏠 Home folder: $HOME"
    echo "  📁 Documents: $HOME/Documents" 
    echo "  🖥️  Desktop: $HOME/Desktop"
    echo "  📂 Downloads: $HOME/Downloads"
    echo ""
    
    # Suggest some common directories
    suggestions=("$HOME" "$HOME/Documents" "$HOME/Desktop" "$HOME/Downloads")
    
    echo "Common directories:"
    for i in "${!suggestions[@]}"; do
        if [ -d "${suggestions[$i]}" ]; then
            echo "  $((i+1)). ${suggestions[$i]}"
        fi
    done
    echo ""
    
    while true; do
        read -p "Enter the full path to the directory you want to browse: " user_path
        
        # Expand ~ to home directory
        user_path="${user_path/#\~/$HOME}"
        
        if [ -d "$user_path" ]; then
            # Update ROOT_PATH in .env file
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s|ROOT_PATH=.*|ROOT_PATH=$user_path|" .env
            else
                # Linux
                sed -i "s|ROOT_PATH=.*|ROOT_PATH=$user_path|" .env
            fi
            print_success "ROOT_PATH set to: $user_path"
            ROOT_PATH="$user_path"
            break
        else
            print_error "Directory '$user_path' does not exist. Please try again."
        fi
    done
else
    if [ ! -d "$ROOT_PATH" ]; then
        print_error "Directory $ROOT_PATH does not exist!"
        echo ""
        echo "Please edit .env file and set ROOT_PATH to a valid directory, then run this script again."
        exit 1
    fi
    print_success "ROOT_PATH is configured: $ROOT_PATH"
fi

# Set default port
PORT=${PORT:-2929}

echo ""
echo "📋 Configuration Summary:"
echo "  📂 Browse directory: $ROOT_PATH"
echo "  🌐 Web interface: http://localhost:$PORT"
echo ""

# Confirm before proceeding
read -p "Continue with installation? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 1
fi

echo ""
print_info "Starting installation..."

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
if docker compose ps -q | grep -q .; then
    docker compose down
fi

# Build containers
echo "🔨 Building NextBrowse containers..."
if docker compose version &> /dev/null; then
    docker compose build --no-cache
else
    docker-compose build --no-cache
fi

# Start services
echo "🚀 Starting NextBrowse services..."
if docker compose version &> /dev/null; then
    docker compose up -d
else
    docker-compose up -d
fi

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 8

# Health check
max_attempts=12
attempt=1
while [ $attempt -le $max_attempts ]; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" | grep -q "200\|301\|302"; then
        break
    fi
    echo "   Attempt $attempt/$max_attempts - waiting for service..."
    sleep 5
    ((attempt++))
done

# Check if services are running
if docker compose ps 2>/dev/null | grep -q "Up" || docker-compose ps 2>/dev/null | grep -q "Up"; then
    echo ""
    print_success "🎉 NextBrowse installation completed successfully!"
    echo ""
    echo "📱 NextBrowse is now running and ready to use:"
    echo ""
    echo "  🌐 File Browser Interface: http://localhost:$PORT"
    echo "  📁 Direct File Access: http://localhost:$PORT/files/"
    echo "  📂 Browsing Directory: $ROOT_PATH"
    echo ""
    echo "📋 Useful commands:"
    echo "  🛑 Stop services:    docker compose down"
    echo "  📊 View logs:        docker compose logs -f"
    echo "  🔄 Restart:          docker compose restart"
    echo "  🏗️  Rebuild:          docker compose build --no-cache"
    echo "  🚀 Start again:      ./start.sh"
    echo ""
    echo "💡 Pro tips:"
    echo "  • Bookmark http://localhost:$PORT for easy access"
    echo "  • Use the file browser to navigate, upload, and manage files"
    echo "  • Files are served directly for viewing/downloading"
    echo ""
else
    print_error "Installation failed - services are not running properly"
    echo ""
    echo "📋 Troubleshooting:"
    echo "  📊 Check logs: docker compose logs"
    echo "  🔍 Check status: docker compose ps"
    echo "  🛠️  Try rebuilding: docker compose build --no-cache"
    echo ""
    exit 1
fi
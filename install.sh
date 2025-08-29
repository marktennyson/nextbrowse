#!/usr/bin/env bash

# NextBrowse Installation Script (improved)
# Sets up NextBrowse File Browser with Docker, with proper logging and safe defaults

set -Eeuo pipefail

# ------------ Styling ------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ------------ Logging ------------
LOG_DIR="logs"
mkdir -p "$LOG_DIR"
TS="$(date +'%Y%m%d_%H%M%S')"
LOG_FILE="$LOG_DIR/install_${TS}.log"

# Prefix all logs with timestamps; mirror to console and file.
# shellcheck disable=SC2064
exec > >(awk '{ print strftime("[%Y-%m-%d %H:%M:%S]"), $0 }' | tee -a "$LOG_FILE") 2>&1

log_info()    { echo -e "${BLUE}ℹ️  $*${NC}"; }
log_success() { echo -e "${GREEN}✅ $*${NC}"; }
log_warn()    { echo -e "${YELLOW}⚠️  $*${NC}"; }
log_error()   { echo -e "${RED}❌ $*${NC}"; }

last_cmd=""
trap 'last_cmd="$BASH_COMMAND"' DEBUG
on_error() {
  local exit_code=$?
  echo
  log_error "Script failed (exit $exit_code)"
  log_error "While running: ${last_cmd}"
  log_info  "See full logs at: ${LOG_FILE}"
  exit $exit_code
}
trap on_error ERR SIGINT SIGTERM

echo -e "${BLUE}🚀 NextBrowse Installation Script${NC}"
echo -e "${BLUE}===================================${NC}"
log_info "Logs: ${LOG_FILE}"

# ------------ Helpers ------------
command_exists() { command -v "$1" >/dev/null 2>&1; }

# Compose wrapper (plugin or standalone)
set_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
  elif command_exists docker-compose; then
    COMPOSE_CMD="docker-compose"
  else
    log_error "Docker Compose is not available!"
    echo -e "  Install: https://docs.docker.com/compose/install/"
    exit 1
  fi
}
dc() { # run compose command
  # shellcheck disable=SC2086
  $COMPOSE_CMD "$@"
}

require_tooling() {
  log_info "🔍 Checking Docker installation..."
  if ! command_exists docker; then
    log_error "Docker is not installed!"
    echo -e "  macOS/Windows: https://www.docker.com/products/docker-desktop"
    echo -e "  Linux: https://docs.docker.com/engine/install/"
    exit 1
  fi
  log_success "Docker found"

  set_compose_cmd
  log_success "Docker Compose found (${COMPOSE_CMD})"

  if ! docker info >/dev/null 2>&1; then
    log_error "Docker daemon is not running!"
    echo -e "${YELLOW}Please start Docker and try again.${NC}"
    exit 1
  fi
  log_success "Docker daemon is running"

  if ! command_exists curl; then
    log_warn "curl not found. Health checks will be limited."
  fi
}

# ------------ Environment ------------
setup_env() {
  log_info "⚙️  Setting up environment..."
  if [ ! -f .env ]; then
    log_warn ".env not found, creating..."
    DEFAULT_ROOT_PATH="${HOME}/Documents"
    read -r -p "Enter the root directory to browse (default: ${DEFAULT_ROOT_PATH}): " ROOT_PATH_INPUT || true
    ROOT_PATH="${ROOT_PATH_INPUT:-$DEFAULT_ROOT_PATH}"

    cat > .env << EOF
# NextBrowse Docker Configuration
ROOT_PATH=$ROOT_PATH

# Port to run the application on (optional, defaults to 2929)
PORT=2929

# Internal configuration (for containers)
GO_PORT=8080
NEXT_PORT=3000
NEXT_PUBLIC_BASE_URL=http://localhost:2929
NEXT_PUBLIC_GO_API_URL=
EOF
    log_success "Created .env file with ROOT_PATH=${ROOT_PATH}"
  else
    log_success ".env file already exists"
  fi

  # Export env vars from .env safely
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a

  ROOT_PATH="${ROOT_PATH:-$HOME/Documents}"
  PORT="${PORT:-2929}"

  # Make sure ROOT_PATH exists; if not, create with test files
  if [ ! -d "$ROOT_PATH" ]; then
    log_warn "📁 Directory $ROOT_PATH does not exist. Creating it..."
    mkdir -p "$ROOT_PATH"
    echo "Welcome to NextBrowse!" > "$ROOT_PATH/welcome.txt"
    echo "This is a test file created during installation." > "$ROOT_PATH/test-file.txt"
    mkdir -p "$ROOT_PATH/sample-folder"
    echo "This file is in a subdirectory." > "$ROOT_PATH/sample-folder/nested-file.txt"
    echo '{"message": "Sample JSON file", "created": "during installation"}' > "$ROOT_PATH/sample-folder/data.json"
    log_success "Created test directory and files"
  fi

  # Make helper scripts executable if present
  log_info "🔧 Making scripts executable (if present)..."
  [ -f start.sh ] && chmod +x start.sh
  [ -f stop.sh ] && chmod +x stop.sh
  [ -f start-go-backend.sh ] && chmod +x start-go-backend.sh
}

# ------------ Compose validation ------------
validate_compose() {
  log_info "🔍 Verifying Docker Compose setup..."
  if [ ! -f "docker-compose.yml" ] && [ ! -f "compose.yml" ]; then
    log_error "docker-compose.yml (or compose.yml) not found in current directory"
    exit 1
  fi

  if dc config >/dev/null 2>&1; then
    log_success "Docker Compose configuration is valid"
  else
    log_error "Docker Compose configuration is invalid"
    exit 1
  fi
}

# ------------ Build & Run ------------
start_stack() {
  log_info "🚀 Starting NextBrowse services..."

  # Stop any existing containers for this project
  if dc ps -q 2>/dev/null | grep -q .; then
    log_warn "Stopping any existing containers..."
    dc down
  fi

  # Use cache as much as possible
  export DOCKER_BUILDKIT=1
  export COMPOSE_DOCKER_CLI_BUILD=1

  log_info "🔨 Building containers (cache enabled)..."
  # NOTE: intentionally NO --no-cache (to preserve build cache)
  #       and NO --pull (to avoid invalidating caches unnecessarily).
  dc build

  log_info "🚀 Starting services..."
  dc up -d --remove-orphans

  log_info "⏳ Waiting for services to start..."
  sleep 5

  # Health check with retries
  local max_attempts=12
  local attempt=1
  log_info "🏥 Checking service health at http://localhost:${PORT} ..."
  while [ $attempt -le $max_attempts ]; do
    if command_exists curl; then
      http_code="$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}" || true)"
      if [[ "$http_code" =~ ^(200|301|302)$ ]]; then
        log_success "Services are healthy! (HTTP $http_code)"
        break
      fi
    else
      # Fallback: check container status only
      if dc ps 2>/dev/null | grep -q "Up"; then
        log_success "Services appear to be running."
        break
      fi
    fi
    echo "   Attempt $attempt/$max_attempts - still waiting..."
    sleep 5
    ((attempt++))
  done

  if [ $attempt -gt $max_attempts ]; then
    log_error "Services failed to start properly"
    log_info "Showing last 50 lines of logs:"
    dc logs --tail=50 || true
    echo
    log_info "💡 Try these commands:"
    echo -e "   • Restart: ${YELLOW}./start.sh${NC}"
    echo -e "   • View logs: ${YELLOW}${COMPOSE_CMD} logs -f${NC}"
    echo -e "   • Stop: ${YELLOW}./stop.sh${NC}"
    exit 1
  fi

  if dc ps 2>/dev/null | grep -q "Up"; then
    log_success "🎉 NextBrowse started successfully!"
    echo
    log_info "📱 Access NextBrowse:"
    echo -e "   🌐 File Browser: ${YELLOW}http://localhost:${PORT}${NC}"
    echo -e "   📁 Direct File Access: ${YELLOW}http://localhost:${PORT}/files/${NC}"
    echo -e "   🏥 Health Check: ${YELLOW}http://localhost:${PORT}/health${NC}"
    echo
    log_info "📂 Browsing Directory: ${YELLOW}${ROOT_PATH}${NC}"
    echo
    log_info "💡 Management Commands:"
    echo -e "   • Stop: ${YELLOW}./stop.sh${NC}"
    echo -e "   • View logs: ${YELLOW}${COMPOSE_CMD} logs -f${NC}"
    echo -e "   • Restart: ${YELLOW}./start.sh${NC}"
    echo
    log_success "🚀 NextBrowse is now running and ready to use!"
    echo -e "${GREEN}📝 Log file: ${LOG_FILE}${NC}"
  else
    log_error "Services failed to start"
    echo -e "${YELLOW}Check logs with: ${COMPOSE_CMD} logs${NC}"
    exit 1
  fi
}

# ------------ Main flow ------------
require_tooling
setup_env
validate_compose

echo
log_success "🎉 Installation checks completed successfully!"
echo
echo -e "${BLUE}📋 Configuration Summary:${NC}"
echo -e "   📂 Browse directory: ${YELLOW}$ROOT_PATH${NC}"
echo -e "   🌐 Web interface: ${YELLOW}http://localhost:$PORT${NC}"
echo -e "   📝 Logs: ${YELLOW}${LOG_FILE}${NC}"
echo

read -r -p "Would you like to start NextBrowse now? (Y/n): " -n 1 -s REPLY || true
echo
if [[ "$REPLY" =~ ^[Nn]$ ]]; then
  echo
  log_info "📋 To start NextBrowse later:"
  echo -e "   • Start: ${YELLOW}./start.sh${NC}"
  echo -e "   • Stop: ${YELLOW}./stop.sh${NC}"
  echo -e "   • View logs: ${YELLOW}${COMPOSE_CMD} logs -f${NC}"
  echo
  log_success "NextBrowse is ready to use. Log: ${LOG_FILE}"
  exit 0
fi

start_stack

#!/bin/bash

# Simple Docker Build Script Wrapper
# Wrapper for the comprehensive production build pipeline

set -e

# Colors for output
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[BUILD]${NC} $*"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_SCRIPT="$SCRIPT_DIR/scripts/build-production.sh"

# Check if the build script exists
if [ ! -f "$BUILD_SCRIPT" ]; then
    echo "Error: Build script not found at $BUILD_SCRIPT"
    exit 1
fi

log "NextBrowse Docker Build Wrapper"
log "Delegating to: $BUILD_SCRIPT"
log ""

# Pass all arguments to the production build script
exec "$BUILD_SCRIPT" "$@"

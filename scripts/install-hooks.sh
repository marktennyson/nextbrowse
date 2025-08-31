#!/bin/bash

# Git Hooks Installation Script for NextBrowse
# Installs Git hooks for automated asset management

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[HOOKS]${NC} $*"
}

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_SRC_DIR="$PROJECT_ROOT/scripts/hooks"
HOOKS_TARGET_DIR="$PROJECT_ROOT/.git/hooks"

log "Installing NextBrowse Git hooks..."

# Check if source hooks exist
if [ ! -d "$HOOKS_SRC_DIR" ]; then
    echo -e "${YELLOW}[ERROR]${NC} Hooks source directory not found: $HOOKS_SRC_DIR"
    exit 1
fi

# Install each hook
for hook_file in "$HOOKS_SRC_DIR"/*; do
    if [ -f "$hook_file" ]; then
        hook_name=$(basename "$hook_file")
        target_file="$HOOKS_TARGET_DIR/$hook_name"
        
        log "Installing $hook_name hook..."
        
        # Backup existing hook if it exists
        if [ -f "$target_file" ]; then
            cp "$target_file" "$target_file.backup"
            log "Backed up existing $hook_name hook"
        fi
        
        # Copy and make executable
        cp "$hook_file" "$target_file"
        chmod +x "$target_file"
        
        echo -e "${GREEN}[SUCCESS]${NC} Installed $hook_name hook"
    fi
done

log "Git hooks installation completed!"
log ""
log "Installed hooks:"
log "  - pre-commit: Compresses build artifacts before commit (production-ready branch only)"
log "  - post-checkout: Extracts build artifacts after checkout/pull (production-ready branch only)"
log ""
log "To uninstall hooks, delete files from: $HOOKS_TARGET_DIR"

#!/usr/bin/env bash

# NextBrowse Restart Script
# Stops and starts the Docker stack, preferring prebuilt artifacts when available

set -Eeuo pipefail

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()      { printf "%b\n" "$*"; }
info()     { log "${BLUE}[*]${NC} $*"; }
ok()       { log "${GREEN}[ok]${NC} $*"; }
warn()     { log "${YELLOW}[!]${NC} $*"; }
error()    { log "${RED}[x]${NC} $*"; }

command_exists() { command -v "$1" >/dev/null 2>&1; }

set_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
  elif command_exists docker-compose; then
    COMPOSE_CMD="docker-compose"
  else
    error "Docker Compose is not available"
    exit 1
  fi
}

dc() {
  # shellcheck disable=SC2086
  $COMPOSE_CMD "$@"
}

# Load environment if present
if [ -f .env ]; then
  set -a; . ./.env; set +a
fi

PORT="${PORT:-2929}"

set_compose_cmd

info "Restarting NextBrowse stack..."

# Determine if prebuilt artifacts are present
USE_PREBUILT=0
if [ -d "frontend/.next/standalone" ] && [ -f "backend/nextbrowse-backend" ] && [ -f "docker-compose.prebuilt.yml" ]; then
  USE_PREBUILT=1
fi

FILES=(-f docker-compose.yml)
if [ "$USE_PREBUILT" -eq 1 ]; then
  info "Using prebuilt artifacts (docker-compose.prebuilt.yml)"
  FILES+=( -f docker-compose.prebuilt.yml )
else
  info "No complete prebuilt artifacts found; using normal compose build"
fi

# Stop then start
dc ${FILES[@]} down || true
if [ "$USE_PREBUILT" -eq 0 ]; then
  dc build
fi
dc ${FILES[@]} up -d --remove-orphans

# Basic health check via nginx port
info "Waiting for services on http://localhost:${PORT} ..."
attempt=1
max_attempts=12
while [ $attempt -le $max_attempts ]; do
  if command_exists curl; then
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}" || true)
    if [[ "$code" =~ ^(200|301|302)$ ]]; then
      ok "Services are up (HTTP $code)"
      break
    fi
  else
    if dc ps 2>/dev/null | grep -q "Up"; then
      ok "Containers are running"
      break
    fi
  fi
  sleep 5
  attempt=$((attempt+1))
done

if [ $attempt -gt $max_attempts ]; then
  error "Services did not become healthy in time"
  dc ${FILES[@]} logs --tail=100 || true
  exit 1
fi

ok "NextBrowse restarted. Open: http://localhost:${PORT}"
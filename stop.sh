#!/usr/bin/env bash
echo "This script is deprecated. Use 'docker compose down' and './restart.sh' instead."
if docker compose version >/dev/null 2>&1; then
    exec docker compose down
elif command -v docker-compose >/dev/null 2>&1; then
    exec docker-compose down
fi
exit 0
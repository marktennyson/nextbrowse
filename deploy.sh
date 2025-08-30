#!/bin/bash

# Full build and deploy script for NextBrowse
# This script builds the Go binary and starts the entire stack

set -e

echo "🚀 NextBrowse Build & Deploy"
echo "=============================="

# Build the Go backend
echo "📦 Building Go backend..."
cd backend
./build.sh
cd ..

echo ""
echo "🐳 Starting Docker services..."
docker-compose up --build

echo ""
echo "✅ NextBrowse is running!"
echo "📱 Frontend: http://localhost:2929"
echo "🔧 Backend API: http://localhost:2929/api"

#!/bin/bash

# NextBrowse Docker Startup Script

echo "🚀 Starting NextBrowse File Browser..."
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating one from template..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "📝 Please edit .env file and set your ROOT_PATH, then run this script again."
        echo "   Example: ROOT_PATH=/Users/yourusername/Documents"
        exit 1
    else
        echo "❌ Error: .env.example not found!"
        exit 1
    fi
fi

# Read environment variables
source .env

# Check if ROOT_PATH is set and exists
if [ -z "$ROOT_PATH" ]; then
    echo "❌ Error: ROOT_PATH not set in .env file"
    echo "   Please edit .env and set ROOT_PATH to your desired directory"
    exit 1
fi

if [ ! -d "$ROOT_PATH" ]; then
    echo "❌ Error: Directory $ROOT_PATH does not exist"
    echo "   Please check your ROOT_PATH in .env file"
    exit 1
fi

# Set default port if not specified
PORT=${PORT:-8080}

echo "📂 Browsing directory: $ROOT_PATH"
echo "🌐 Will be available at: http://localhost:$PORT"
echo ""

# Build and start containers
echo "🔨 Building containers..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

# Wait a moment for services to start
echo "⏳ Waiting for services to start..."
sleep 5

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "✅ NextBrowse is now running!"
    echo ""
    echo "📱 Open your browser and go to:"
    echo "   🌐 File Browser: http://localhost:$PORT"
    echo "   📁 Direct Files: http://localhost:$PORT/files/"
    echo ""
    echo "📋 Management commands:"
    echo "   Stop:     docker-compose down"
    echo "   Logs:     docker-compose logs -f"
    echo "   Rebuild:  docker-compose build --no-cache"
    echo ""
else
    echo "❌ Error: Services failed to start"
    echo "📋 Check logs with: docker-compose logs"
    exit 1
fi
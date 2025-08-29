#!/bin/bash

# NextBrowse Docker Startup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting NextBrowse File Browser${NC}"
echo -e "${BLUE}====================================${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Docker is running
echo -e "${BLUE}🔍 Checking Docker...${NC}"
if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    echo -e "${YELLOW}Please install Docker and run ./install.sh first${NC}"
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker daemon is not running!${NC}"
    echo -e "${YELLOW}Please start Docker and try again${NC}"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null && ! command_exists docker-compose; then
    echo -e "${RED}❌ Docker Compose is not available!${NC}"
    echo -e "${YELLOW}Please install Docker Compose${NC}"
    exit 1
fi

# Check if installation was completed
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo -e "${YELLOW}💡 Run ./install.sh first${NC}"
    exit 1
fi

if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ docker-compose.yml not found!${NC}"
    echo -e "${YELLOW}💡 Run ./install.sh first${NC}"
    exit 1
fi

# Load environment variables
source .env

# Check if ROOT_PATH exists
if [ ! -d "$ROOT_PATH" ]; then
    echo -e "${RED}❌ Directory $ROOT_PATH does not exist!${NC}"
    echo -e "${YELLOW}💡 Please check your ROOT_PATH in .env file${NC}"
    exit 1
fi

# Set default port
PORT=${PORT:-2929}

echo -e "${GREEN}✅ Docker and configuration verified${NC}"
echo -e "${BLUE}📋 Configuration:${NC}"
echo -e "   📂 Browse directory: ${YELLOW}$ROOT_PATH${NC}"
echo -e "   🌐 Web interface: ${YELLOW}http://localhost:$PORT${NC}"
echo

# Stop any existing containers
echo -e "${BLUE}🛑 Stopping any existing containers...${NC}"
if docker compose ps -q 2>/dev/null | grep -q .; then
    if docker compose version &> /dev/null; then
        docker compose down
    else
        docker-compose down
    fi
fi

# Build and start containers
echo -e "${BLUE}🔨 Building containers...${NC}"
if docker compose version &> /dev/null; then
    docker compose build --no-cache
else
    docker-compose build --no-cache
fi

echo -e "${BLUE}🚀 Starting NextBrowse services...${NC}"
if docker compose version &> /dev/null; then
    docker compose up -d
else
    docker-compose up -d
fi

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 8

# Health check with retries
max_attempts=12
attempt=1
echo -e "${BLUE}🏥 Checking service health...${NC}"

while [ $attempt -le $max_attempts ]; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✅ Services are healthy!${NC}"
        break
    fi
    echo -e "   Attempt $attempt/$max_attempts - waiting for services..."
    sleep 5
    ((attempt++))
done

if [ $attempt -gt $max_attempts ]; then
    echo -e "${RED}❌ Services failed to start properly${NC}"
    echo -e "${YELLOW}Showing logs for troubleshooting:${NC}"
    if docker compose version &> /dev/null; then
        docker compose logs --tail=20
    else
        docker-compose logs --tail=20
    fi
    exit 1
fi

# Check if services are running
if docker compose ps 2>/dev/null | grep -q "Up" || docker-compose ps 2>/dev/null | grep -q "Up"; then
    echo
    echo -e "${GREEN}🎉 NextBrowse started successfully!${NC}"
    echo
    echo -e "${BLUE}📱 Access NextBrowse:${NC}"
    echo -e "   🌐 File Browser: ${YELLOW}http://localhost:$PORT${NC}"
    echo -e "   📁 Direct File Access: ${YELLOW}http://localhost:$PORT/files/${NC}"
    echo -e "   🏥 Health Check: ${YELLOW}http://localhost:$PORT/health${NC}"
    echo
    echo -e "${BLUE}📂 Browsing Directory: ${YELLOW}$ROOT_PATH${NC}"
    echo
    echo -e "${BLUE}💡 Useful Commands:${NC}"
    echo -e "   • Stop services: ${YELLOW}docker-compose down${NC}"
    echo -e "   • View logs: ${YELLOW}docker-compose logs -f${NC}"
    echo -e "   • Restart: ${YELLOW}docker-compose restart${NC}"
    echo -e "   • Rebuild: ${YELLOW}docker-compose build --no-cache${NC}"
    echo -e "   • Monitor: ${YELLOW}docker-compose ps${NC}"
    echo
    echo -e "${GREEN}🚀 NextBrowse is now running and ready to use!${NC}"
    echo -e "${YELLOW}Press Ctrl+C to view logs, or use 'docker-compose down' to stop${NC}"
    echo

    # Create a cleanup function for Ctrl+C
    cleanup() {
        echo -e "\n${YELLOW}Showing recent logs...${NC}"
        if docker compose version &> /dev/null; then
            docker compose logs --tail=10
        else
            docker-compose logs --tail=10
        fi
        echo -e "\n${BLUE}NextBrowse is still running in the background${NC}"
        echo -e "${YELLOW}Use 'docker-compose down' to stop the services${NC}"
        exit 0
    }

    # Set up signal handling to show logs on Ctrl+C
    trap cleanup SIGINT SIGTERM

    # Follow logs
    if docker compose version &> /dev/null; then
        docker compose logs -f
    else
        docker-compose logs -f
    fi
else
    echo -e "${RED}❌ Services failed to start${NC}"
    echo -e "${YELLOW}Check logs with: docker-compose logs${NC}"
    exit 1
fi
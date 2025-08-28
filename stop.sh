#!/bin/bash

# NextBrowse Stop Script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping NextBrowse File Browser${NC}"
echo -e "${BLUE}===================================${NC}"

# Stop Docker Compose services
if docker compose version &> /dev/null; then
    echo -e "${YELLOW}Stopping services with docker compose...${NC}"
    docker compose down
elif command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Stopping services with docker-compose...${NC}"
    docker-compose down
else
    echo -e "${RED}❌ Docker Compose not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ NextBrowse stopped successfully${NC}"
echo
echo -e "${BLUE}💡 Useful commands:${NC}"
echo -e "   • Start again: ${YELLOW}./start.sh${NC}"
echo -e "   • View logs: ${YELLOW}docker-compose logs${NC}"
echo -e "   • Check status: ${YELLOW}docker-compose ps${NC}"
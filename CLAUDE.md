# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NextBrowse is a file browser application that provides a web interface for browsing and managing files on the server filesystem. It consists of:
- **Frontend**: Next.js 15 application in the `/frontend` folder
- **Backend**: Go-based API server in the `/backend` folder  
- **Nginx**: Reverse proxy for serving static files and routing requests

## Development Commands

### Frontend (Next.js)
Navigate to `/frontend` folder first:
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production bundle with Turbopack  
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Backend (Go)
Navigate to `/backend` folder first:
- `go run main.go` - Start Go development server
- `go build` - Build Go binary
- `go mod download` - Download dependencies

### Full Stack Development
From project root:
- `./start.sh` - Start full stack with Docker Compose
- `./start-go-backend.sh` - Start only Go backend for development
- `./stop.sh` - Stop all services

## Architecture

### Frontend Structure (`/frontend`)
- **App Router**: Uses Next.js 15 App Router architecture
- **Client Components**: React components in `/components/` for UI interactions
- **Styling**: TailwindCSS v4 for styling
- **API Client**: Communicates with Go backend via HTTP requests

### Backend Structure (`/backend`)
- **Go HTTP Server**: RESTful API server built with Go
- **Handlers**: File system operations in `/handlers/`:
  - `/api/fs/list` - List directory contents
  - `/api/fs/upload` - File upload handling
  - `/api/fs/copy` - Copy files/directories
  - `/api/fs/move` - Move/rename files/directories  
  - `/api/fs/delete` - Delete files/directories
  - `/api/fs/mkdir` - Create directories
- **Middleware**: Security and CORS handling
- **Models**: Data structures for API responses

### File System Security
- **Path Safety**: All file operations use `safeResolve()` in `lib/fs-helpers.ts` to prevent path traversal attacks
- **Root Directory**: File operations are restricted to `ROOT_DIR` environment variable
- **Public Access**: Files served via nginx at `PUBLIC_FILES_BASE` path

### Key Components
- **FileList**: Grid display of files/directories with selection
- **Toolbar**: File operation buttons (upload, copy, move, delete)
- **UploadDropzone**: Drag-and-drop file upload interface
- **ContextMenu**: Right-click context menu for file operations
- **MoveCopyDialog**: Modal for move/copy operations
- **ConfirmDialog**: Confirmation dialogs for destructive operations
- **Breadcrumbs**: Navigation breadcrumb trail

### Environment Configuration
Required environment variables in `.env.local`:
- `ROOT_DIR` - Server filesystem root directory to browse
- `PUBLIC_FILES_BASE` - URL base path for serving files
- `NEXT_PUBLIC_BASE_URL` - Frontend base URL

## Deployment

### Local Development
1. Copy `.env.example` to `.env.local` and configure paths
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`
4. Configure nginx to proxy API calls and serve files

### Docker Production
- Uses `docker-compose.yml` with Next.js app and nginx services
- Build: `docker-compose build`
- Start: `docker-compose up -d`
- Exposes on port 6789 via nginx

## Dependencies
- **Next.js 15**: React framework with App Router
- **React 19**: UI library
- **TailwindCSS v4**: Utility-first CSS framework
- **Busboy**: Multipart form parsing for file uploads
- **TypeScript**: Static type checking
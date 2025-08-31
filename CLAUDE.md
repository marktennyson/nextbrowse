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
- `go vet ./...` - Run Go static analysis
- `go test ./...` - Run Go tests (when applicable)

### Full Stack Development

From project root:

- `./install.sh` - Install prerequisites and optionally start the stack
- `./restart.sh` - Restart the full stack with Docker Compose
- `docker compose logs -f` - Follow logs
- `docker compose build --no-cache` - Rebuild images from scratch

## Architecture

### Frontend Structure (`/frontend`)

- **App Router**: Uses Next.js 15 App Router architecture
- **Client Components**: React components in `/components/` for UI interactions
- **Styling**: TailwindCSS v4 for styling
- **API Client**: Communicates with Go backend via HTTP requests

### Backend Structure (`/backend`)

- **Go HTTP Server**: RESTful API server built with Gin framework
- **Handlers**: File system operations in `/handlers/`:
  - `/api/fs/list` - List directory contents
  - `/api/fs/read` - Read file contents
  - `/api/fs/upload` - File upload handling
  - `/api/fs/copy` - Copy files/directories
  - `/api/fs/move` - Move/rename files/directories
  - `/api/fs/delete` - Delete files/directories
  - `/api/fs/mkdir` - Create directories
  - `/api/fs/download` - Download single files
  - `/api/fs/download-multiple` - Download multiple files as archive
  - `/api/fs/share/create` - Create shareable links
  - `/api/fs/share/:shareId` - Access shared files
- **TUS Upload**: Resumable file uploads via `/api/tus/` endpoints
- **Middleware**: Security headers and CORS handling
- **Models**: Data structures for API responses

### File System Security

- **Path Safety**: All file operations validate paths server-side to prevent traversal attacks
- **Root Directory**: File operations are restricted to the `ROOT_PATH` environment variable
- **Public Access**: Files are served via nginx under `/files`

### Key Frontend Components

- **FileManager**: Main file browser interface with state management hooks:
  - `useFileData` - Data fetching and caching
  - `useFileSelection` - Multi-select functionality  
  - `useFileOperations` - CRUD operations
  - `useFileFiltering` - Search and filtering
  - `useAudioOperations` - Music player integration
- **FileList**: Grid/list display with drag-and-drop support
- **Toolbar**: File operation buttons and controls
- **UploadDropzone**: TUS-based resumable file upload interface
- **ContextMenu**: Right-click context menu for file operations
- **MoveCopyDialog**: Modal for move/copy operations
- **ConfirmDialog**: Confirmation dialogs for destructive operations
- **Breadcrumbs**: Navigation breadcrumb trail
- **MusicPlayer**: Audio playback with playlist support
- **IDE**: Code editor with Monaco Editor integration

### Environment Configuration

Use a single `.env` in the project root (copy from `.env.example`). Key variables:

- `ROOT_PATH` - Absolute path on the host to browse (mounted into containers)
- `PORT` - Host port exposed by nginx (default 2929)
- `NEXT_PUBLIC_BASE_URL` - Public base URL used for share links
- `GO_PORT` - Internal Go backend port (default 9932)
- `NEXT_PORT` - Internal Next.js port (default 3000)

## Deployment

### Local Development

1. Copy `.env.example` to `.env` and configure paths
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`
4. Optionally run Docker stack via `./install.sh`

### Docker Production

- Uses `docker-compose.yml` with Next.js app, Go backend, and nginx services
- Build: `docker compose build`
- Start: `docker compose up -d`
- Exposes on port 2929 via nginx

### Prebuilt Mode

For production deployments, prebuilt artifacts can be committed:
- Backend: `backend/nextbrowse-backend` (Linux binary)
- Frontend: `frontend/.next/standalone` and `frontend/.next/static`

When present, `docker-compose.prebuilt.yml` is used automatically.

## Dependencies

- **Next.js 15**: React framework with App Router
- **React 19**: UI library with concurrent features
- **TailwindCSS v4**: Utility-first CSS framework
- **Monaco Editor**: Code editor for IDE functionality
- **Gin**: Go HTTP web framework
- **Framer Motion**: Animation library for smooth UI transitions
- **React Hot Toast**: Toast notifications
- **TUS**: Resumable file upload protocol
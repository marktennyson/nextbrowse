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

- `./install.sh` - Install prerequisites and optionally start the stack
- `./restart.sh` - Restart the full stack with Docker Compose
- `docker compose logs -f` - Follow logs

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

- **Path Safety**: All file operations validate paths server-side to prevent traversal attacks
- **Root Directory**: File operations are restricted to the `ROOT_PATH` environment variable
- **Public Access**: Files are served via nginx under `/files`

### Key Components

- **FileList**: Grid display of files/directories with selection
- **Toolbar**: File operation buttons (upload, copy, move, delete)
- **UploadDropzone**: Drag-and-drop file upload interface
- **ContextMenu**: Right-click context menu for file operations
- **MoveCopyDialog**: Modal for move/copy operations
- **ConfirmDialog**: Confirmation dialogs for destructive operations
- **Breadcrumbs**: Navigation breadcrumb trail

### Environment Configuration

Use a single `.env` in the project root (copy from `.env.example`). Key variables:

- `ROOT_PATH` - Absolute path on the host to browse (mounted into containers)
- `PORT` - Host port exposed by nginx (default 2929)
- `NEXT_PUBLIC_BASE_URL` - Public base URL used for share links

## Deployment

### Local Development

1. Copy `.env.example` to `.env` and configure paths
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`
4. Optionally run Docker stack via `./install.sh`

### Docker Production

- Uses `docker-compose.yml` with Next.js app and nginx services
- Build: `docker-compose build`
- Start: `docker-compose up -d`
- Exposes on port 2929 via nginx

## Dependencies

- **Next.js 15**: React framework with App Router
- **React 19**: UI library
- **TailwindCSS v4**: Utility-first CSS framework
- **Busboy**: Multipart form parsing for file uploads
- **TypeScript**: Static type checking

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NextBrowse is a Next.js 15 file browser application that provides a web interface for browsing and managing files on the server filesystem. It combines a Next.js frontend with API routes for file system operations and nginx for serving static files.

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production bundle with Turbopack  
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Architecture

### Frontend Structure
- **App Router**: Uses Next.js 15 App Router architecture
- **Client Components**: React components in `/components/` for UI interactions
- **Styling**: TailwindCSS v4 for styling

### Backend Structure
- **API Routes**: File system operations exposed via `/app/api/fs/` endpoints:
  - `/api/fs/list` - List directory contents
  - `/api/fs/upload` - File upload handling
  - `/api/fs/copy` - Copy files/directories
  - `/api/fs/move` - Move/rename files/directories  
  - `/api/fs/delete` - Delete files/directories
  - `/api/fs/mkdir` - Create directories

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
# NextBrowse Backend

This is the Go-based API server for NextBrowse file browser.

## Development Setup

1. Install Go 1.22 or later

2. Download dependencies:

```bash
go mod download
```

3. Start development server:

```bash
go run main.go
```

## Building for Docker/Production

We use pre-built binaries for Docker to avoid building on the server. The Linux binary (`nextbrowse-backend`) is committed to git and used by Docker.

### Quick Build (Linux only - for Docker):

```bash
./build.sh
```

### Build All Platforms:

```bash
./build-all.sh
```

This creates:

- `nextbrowse-backend` (Linux - for Docker, committed to git)
- `nextbrowse-backend-macos` (macOS - for local development, gitignored)
- `nextbrowse-backend-windows.exe` (Windows - gitignored)

### Manual Build:

```bash
# For Docker/Linux
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o nextbrowse-backend .

# For local development (macOS)
go build -o nextbrowse-backend-macos .
```

## Environment Variables

Set these environment variables:

```bash
export ROOT_PATH="/path/to/files"
export PORT="9932"
export NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

## Project Structure

- `main.go` - Application entry point
- `handlers/` - HTTP request handlers
- `middleware/` - HTTP middleware (security, CORS)
- `models/` - Data structures
- `config/` - Configuration management
- `utils/` - Utility functions

## API Endpoints

- `GET /api/fs/list` - List directory contents
- `POST /api/fs/upload` - Upload files
- `POST /api/fs/copy` - Copy files/directories
- `POST /api/fs/move` - Move/rename files
- `DELETE /api/fs/delete` - Delete files/directories
- `POST /api/fs/mkdir` - Create directories
- `GET /health` - Health check

## Features

- File system operations with security restrictions
- Chunked file upload support
- CORS handling for frontend integration
- Path traversal protection
- File sharing with temporary links

## Technologies

- Go 1.22+
- Standard HTTP library
- File system operations

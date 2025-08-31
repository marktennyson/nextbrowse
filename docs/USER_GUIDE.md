# NextBrowse — End‑User Guide

Welcome! This guide helps you deploy, configure, and use NextBrowse as a simple web-based file browser for your home or lab. It’s written for non‑experts: follow the steps and you’ll be up and running fast.

## What you get

- Modern, responsive UI (grid/list) for browsing files
- Upload (multi-file, large-file/chunked), download, copy, move, rename, delete
- Create folders
- Read file contents for quick preview (text/code)
- Share links with optional password and expiry (file or folder)
- Fast direct downloads via nginx
- Safe path handling to prevent access outside your chosen root

Note: File editing and “create file” actions may appear in the UI, but the backend write endpoints are not yet available. See “Known limits” below.

## Quick start (Docker, recommended)

Prereqs: Docker + Docker Compose installed.

1. Pick the folder you want to share/browse, e.g. /Users/you/Documents
2. Create a .env file next to docker-compose.yml with:

```
ROOT_PATH=/absolute/path/to/your/folder
PORT=2929
NEXT_PUBLIC_BASE_URL=http://localhost:2929
```

3. Start the stack:

- Run installer: `./install.sh`
- Start/Restart: `./restart.sh`
- Open: http://localhost:2929

That’s it. Your files are mounted read/write into the app’s /app/static (nginx serves downloads from there; the Go API does the rest).

## Services and ports

- nginx (public, serves UI and proxies API) → http://localhost:2929
- frontend (Next.js, internal) → proxied by nginx
- backend (Go API, internal) → proxied at /api/fs/\*

## Environment variables

Set in your .env (used by Docker Compose):

- ROOT_PATH: Absolute path to the directory you want to browse (mounted read/write)
- PORT: Host port for nginx (default 2929)
- NEXT_PUBLIC_BASE_URL: Public base URL used in generated share links (default http://localhost:2929)
- NEXT_PUBLIC_GO_API_URL: Usually blank in Docker (frontend calls Go via nginx). If running frontend alone, set to http://localhost:9932

## Using the app

- Browse: Click folders to enter, use breadcrumbs to navigate.
- Views: Toggle between grid and list.
- Upload: Drag & drop or use the upload button. Large files are chunked automatically.
- Create folder: Use the “New Folder” action; it calls POST /api/fs/mkdir.
- Copy/Move: Select items, choose Copy or Move, pick a destination.
- Rename: Uses Move under the hood; just change the name.
- Delete: Removes files or folders (recursively for folders).
- Download: Single file direct download; multiple selection downloads as a ZIP stream.
- Preview: Basic text/code preview via /api/fs/read for supported files.
- Hidden files: Toggle dotfiles on/off via the toolbar option (handy on Unix/macOS).
- Audio player: Select an audio file and use the Play action to open the built‑in player.
- Large folders: The list uses incremental loading to keep the UI responsive.

### Sharing files and folders

You can create a share link with options:

- Password protection
- Expiration (seconds)
- Allow uploads into a shared folder
- Disable rich viewer (force download)
- Quick download toggle
- Optional title/description/theme/view mode

The app returns a share URL like: http(s)://your-host/share/<id>

Notes:

- Password is validated server-side via /api/fs/share/:shareId/access.
- Directory download for shares isn’t implemented yet (file download is supported).

## Known limits (this version)

- Create file: The UI may expose “New File”, but the backend /api/fs/create endpoint isn’t implemented. Use upload instead.
- Edit/save files: The IDE page calls /api/fs/write which isn’t implemented yet. You can preview files but can’t save edits from the web UI.
- Share downloads: Folder ZIP download from a share endpoint is not implemented.

If you see 404 or errors on /api/fs/create or /api/fs/write, that’s expected with the current backend. These will be added in a future update.

## Security notes

- No authentication: Don’t expose to the public internet. Use on trusted networks or put behind your own auth/reverse proxy.
- Path safety: The server validates paths and blocks traversal outside ROOT_PATH.
- Nginx sends common security headers by default.

## Troubleshooting

- App shows empty directory or errors
  - Check ROOT_PATH in .env points to an existing, accessible folder (read/write as needed).
  - On macOS, ensure Docker Desktop has file access to the chosen path.
- Can’t upload large files
  - nginx client_max_body_size is 10G for API uploads; adjust nginx.conf if needed.
  - Slow networks/timeouts: proxy_read_timeout is set to 300s; tune if necessary.
- 404 on /api/fs/create or /api/fs/write
  - Those endpoints aren’t in the backend yet. Use “Create Folder” and “Upload” instead.
- Port already in use
  - Change PORT in .env, e.g. 9000, and restart.

## Advanced: Running without Docker

- Backend (Go 1.22+):
  - env: ROOT_PATH=/absolute/path NEXT_PUBLIC_BASE_URL=http://localhost:3000 PORT=9932
  - run: go run ./backend
- Frontend (Node 18+):
  - cd frontend && npm install
  - env: NEXT_PUBLIC_GO_API_URL=http://localhost:9932
  - dev: npm run dev (http://localhost:3000)
  - prod: npm run build && npm start
- Reverse proxy: Configure nginx or another proxy to serve frontend and proxy /api/fs to the Go backend.

## API overview (read‑only)

- GET /api/fs/list?path=… → directory listing (pagination supported)
- GET /api/fs/read?path=… → read file content (for previews)
- POST /api/fs/upload → regular multi-file upload
- POST /api/fs/upload-status → chunk resume info
- POST /api/fs/upload-chunk → chunk upload + assembly
- POST /api/fs/upload-cancel → cancel in-flight chunk upload
- POST /api/fs/mkdir → create folder
- POST /api/fs/copy → copy file/folder
- POST /api/fs/move → move/rename
- POST or DELETE /api/fs/delete → delete file/folder
- GET /api/fs/download?path=… → download a single file
- POST /api/fs/download-multiple → stream ZIP of multiple items
- POST /api/fs/share/create → create a share
- GET /api/fs/share/:shareId → get share metadata
- POST /api/fs/share/:shareId/access → password check
- GET /api/fs/share/:shareId/download → download shared file (dir download pending)

## FAQ

- Can I browse multiple roots?
  - Not simultaneously. Run more stacks pointing to different ROOT_PATH values or mount a parent folder.
- Is there authentication?
  - Not built-in. Put nginx behind your own auth (e.g., Basic Auth/OAuth) if needed.
- How big can files be?
  - Chunked uploads support large files; nginx/API timeouts/body limits can be tuned in nginx.conf.

Enjoy NextBrowse!

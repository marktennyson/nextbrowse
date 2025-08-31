# Contributing to NextBrowse

Thanks for your interest in contributing! 🙌

## Getting Started

- Fork and clone the repository
- Create a feature branch from main
- Prefer small, focused pull requests with clear descriptions

## Running locally

Option A: Docker (recommended)

- Create `.env` from `.env.example` and set `ROOT_PATH`
- Run `./install.sh` then `./restart.sh`

Option B: Dev mode (no Docker)

- Backend: Go 1.22+, `go run backend/main.go`
- Frontend: Node 20, `cd frontend && npm install && npm run dev`

## Prebuilt artifacts (to avoid client builds)

To keep end-user CPU usage low, maintainers may commit prebuilt artifacts:

- Go backend (Linux): `backend/nextbrowse-backend`
- Next.js frontend: `frontend/.next/standalone` and `frontend/.next/static`

How to build them:

1. Backend

   - `cd backend`
   - `CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o nextbrowse-backend .`
   - Test locally, then commit the binary

2. Frontend
   - `cd frontend`
   - `npm ci`
   - `npm run build`
   - Commit `.next/standalone` and `.next/static` folders

The runtime will automatically switch to `docker-compose.prebuilt.yml` when these paths exist.

## Code style & checks

- TypeScript/Next.js: run `npm run lint` in `frontend`
- Go: run `go vet ./...` and `go test ./...` when applicable

## Commit messages

- Use concise, descriptive messages (e.g., feat:, fix:, docs:, chore:)

## Pull Requests

- Ensure CI is green (if configured)
- Link related issues
- Include screenshots or recordings for UI changes
- Be responsive to review feedback

Thanks for making NextBrowse better!

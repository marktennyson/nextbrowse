# Contributing to NextBrowse

Thanks for your interest in contributing to NextBrowse! We welcome contributions from the community and are grateful for any help you can provide.

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please be respectful, inclusive, and constructive in all interactions.

## Getting Started

### Prerequisites

- **Docker & Docker Compose**: For the recommended development setup
- **Go 1.23+**: For backend development
- **Node.js 20+**: For frontend development
- **Git**: For version control

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/nextbrowse.git
   cd nextbrowse
   ```

2. **Create Environment File**
   ```bash
   cp .env.example .env
   # Edit .env and set ROOT_PATH to a local directory
   ```

3. **Choose Development Method**

   **Option A: Docker (Recommended)**
   ```bash
   ./install.sh
   ./restart.sh
   ```

   **Option B: Local Development**
   ```bash
   # Backend (Terminal 1)
   cd backend
   go mod download
   go run main.go

   # Frontend (Terminal 2)
   cd frontend
   npm install
   npm run dev
   ```

## Development Workflow

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/feature-name`: New features
- `fix/issue-description`: Bug fixes
- `docs/update-description`: Documentation updates

### Making Changes

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clean, maintainable code
   - Follow existing code style and patterns
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   # Backend tests
   cd backend
   go test ./...
   go vet ./...

   # Frontend tests
   cd frontend
   npm run lint
   npm run build
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add new file upload feature"
   ```

### Commit Message Guidelines

We follow [Conventional Commits](https://conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
- `feat: add drag and drop file upload`
- `fix: resolve path traversal vulnerability`
- `docs: update installation guide`
- `test: add unit tests for file operations`

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

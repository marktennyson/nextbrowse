# NextBrowse Production Pipeline

This document describes the production build and deployment pipeline for NextBrowse, designed to support multi-architecture deployments with automated asset management.

## Overview

The production pipeline consists of:

1. **Multi-Architecture Build System** - Builds for ARM64 and AMD64
2. **Asset Compression** - RAR archives for efficient storage
3. **Git Hooks** - Automated asset management
4. **Production Branch** - Clean deployment branch with pre-built assets
5. **Deployment Scripts** - One-command deployment

## Architecture Support

- **linux/amd64** - Intel/AMD 64-bit systems
- **linux/arm64** - ARM 64-bit systems (Apple Silicon, ARM servers)

## Scripts Overview

### Build Scripts

| Script                        | Purpose                        |
| ----------------------------- | ------------------------------ |
| `scripts/build-production.sh` | Main production build pipeline |
| `docker-build-simple.sh`      | Wrapper for compatibility      |
| `backend/build.sh`            | Go backend build (single arch) |
| `backend/build-all.sh`        | Go backend build (multi-arch)  |

### Deployment Scripts

| Script                         | Purpose                                      |
| ------------------------------ | -------------------------------------------- |
| `scripts/deploy-production.sh` | Production deployment from assets            |
| `deploy.sh`                    | Smart deployment (production vs development) |
| `docker-load.sh`               | Load Docker images from RAR archives         |

### Git Hooks

| Hook                          | Purpose                       |
| ----------------------------- | ----------------------------- |
| `scripts/hooks/pre-commit`    | Compress assets before commit |
| `scripts/hooks/post-checkout` | Extract assets after checkout |
| `scripts/install-hooks.sh`    | Install Git hooks             |

## Usage Examples

### Developer Workflow

```bash
# Build for current platform
./scripts/build-production.sh

# Build for all platforms
./scripts/build-production.sh --all

# Build and create production branch
./scripts/build-production.sh --all --push

# Install Git hooks for automatic asset management
./scripts/install-hooks.sh
```

### End User Deployment

```bash
# Clone production branch
git clone -b production-ready https://github.com/your-repo/nextbrowse.git
cd nextbrowse

# One-command deployment
./deploy.sh --root-path /path/to/your/files

# Alternative: Use production deployment directly
./scripts/deploy-production.sh --root-path /path/to/your/files --port 3000
```

### Docker Image Management

```bash
# Load Docker images from RAR archives
./docker-load.sh

# Load specific architecture
./docker-load.sh --arch arm64

# Force reload existing images
./docker-load.sh --force
```

## Build Process

### 1. Go Backend Build

The pipeline builds Go binaries for both architectures:

```bash
# AMD64
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o nextbrowse-backend-linux-amd64

# ARM64
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o nextbrowse-backend-linux-arm64
```

### 2. Next.js Frontend Build

Builds the frontend with standalone output for Docker:

```bash
npm run build
```

### 3. Docker Image Build

Uses Docker Buildx for multi-platform builds:

```bash
docker buildx build --platform linux/amd64,linux/arm64 --tag nextbrowse-backend:latest
docker buildx build --platform linux/amd64,linux/arm64 --tag nextbrowse-frontend:latest
```

### 4. Asset Compression

Compresses build artifacts into RAR archives:

- `assets/go-binaries.rar` - Go binaries for all architectures
- `assets/nextjs-build.rar` - Next.js standalone build
- `assets/docker-images.rar` - Docker images (tar.gz files)
- `assets/build-info.json` - Build metadata

## Docker Compose Files

| File                               | Purpose                                 |
| ---------------------------------- | --------------------------------------- |
| `docker-compose.yml`               | Development build with live compilation |
| `docker-compose.prebuilt.yml`      | Uses pre-built binaries                 |
| `docker-compose.multiplatform.yml` | Production with multi-arch images       |

## Environment Configuration

Create a `.env` file in the project root:

```env
# Required
ROOT_PATH=/path/to/your/files
PORT=2929

# Optional
NEXT_PUBLIC_BASE_URL=http://localhost:2929
MAX_FILE_SIZE=10737418240
MAX_UPLOAD_SIZE=53687091200
ALLOWED_ORIGINS=*
```

## Git Branch Strategy

### Development Branch (main)

- Source code
- Build scripts
- Development tools
- Git hooks

### Production Branch (production-ready)

- Pre-built assets (RAR archives)
- Production Docker Compose files
- Deployment scripts
- Minimal source code footprint

## Automated Asset Management

Git hooks automatically handle asset compression and extraction:

### Pre-commit Hook

- Compresses build artifacts when committing to `production-ready` branch
- Updates build metadata
- Only processes changed files

### Post-checkout Hook

- Extracts assets after switching to `production-ready` branch
- Restores Go binaries and Next.js build
- Prepares environment for deployment

## Dependencies

### Build Dependencies

```bash
# macOS
brew install docker rar go node

# Ubuntu/Debian
apt install docker.io rar golang nodejs npm

# Required for multi-platform builds
docker buildx create --use
```

### Deployment Dependencies

```bash
# macOS
brew install docker unrar

# Ubuntu/Debian
apt install docker.io unrar
```

## Troubleshooting

### Common Issues

1. **Missing RAR/UNRAR**

   ```bash
   # macOS
   brew install rar unrar

   # Ubuntu/Debian
   apt install rar unrar
   ```

2. **Docker Buildx Not Available**

   ```bash
   docker buildx create --name mybuilder --use
   docker buildx inspect --bootstrap
   ```

3. **Assets Not Found**

   ```bash
   # Make sure you're on the production-ready branch
   git checkout production-ready

   # Or build assets first
   ./scripts/build-production.sh --all --push
   ```

4. **Architecture Detection Issues**
   ```bash
   # Force specific architecture
   ./docker-load.sh --arch amd64
   ./scripts/deploy-production.sh --root-path /data
   ```

## Performance Optimization

### Build Optimization

- Multi-stage Docker builds reduce image size
- Go binaries built with optimization flags
- Next.js standalone mode for minimal runtime

### Deployment Optimization

- RAR compression reduces asset size by ~60%
- Architecture-specific image loading
- Health checks ensure service readiness
- Resource limits prevent resource exhaustion

## Security Considerations

- Read-only containers where possible
- No new privileges security option
- Path validation prevents directory traversal
- Minimal base images (scratch for Go, alpine for utilities)

## Monitoring and Logs

```bash
# View service logs
docker-compose logs -f

# Check service health
docker-compose ps

# Monitor resource usage
docker stats

# View build information
cat assets/build-info.json
```

This production pipeline provides a robust, scalable solution for deploying NextBrowse across different architectures while maintaining ease of use for end users.

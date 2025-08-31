# NextBrowse 📁

A modern, feature-rich file browser built with Next.js 15 and Go, designed to provide a web interface for browsing and managing files on your local machine through Docker and nginx.

- End‑User Guide: see [docs/USER_GUIDE.md](docs/USER_GUIDE.md) for step‑by‑step deployment and usage.
- Current limits: “Create file” and in‑browser save aren’t supported yet; folder download from share links isn’t implemented.

![NextBrowse](https://via.placeholder.com/800x400?text=NextBrowse+File+Manager)

## ✨ Features

- **🎯 Modern UI**: Clean, responsive interface with grid/list views
- **📂 File Operations**: Upload, download, copy, move, delete files and folders
- **🔍 Advanced Search**: Real-time search with filtering options
- **📊 Multiple Views**: Toggle between grid and list display modes
- **🔄 Drag & Drop**: Intuitive drag-and-drop file uploads
- **⚡ High Performance**: Optimized with nginx for fast file serving
- **🐳 Docker Ready**: Easy deployment with Docker Compose
- **🔐 Secure**: Path traversal protection and security headers

## 🚀 Quick Start (Zero local build)

### Prerequisites

- Docker and Docker Compose installed
- A local directory you want to browse
- Docker (Desktop on macOS/Windows; engine + compose on Linux)
- Bash shell (macOS/Linux; Windows via Git Bash or WSL)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd nextbrowse
```

### 2. Configure Environment

```bash
# Copy the environment template
cp .env.example .env

# Edit .env and set your local directory path
# Example: ROOT_PATH=/Users/yourname/Documents
nano .env
```

### 3. Install and Start

```bash
./install.sh    # performs pre-checks and can start the stack
# Later restarts
./restart.sh
```

### 5. Access the Application

Open your browser and navigate to:

- **File Browser**: http://localhost:2929
- **Direct File Access**: http://localhost:2929/files/

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# REQUIRED: Path to the directory you want to browse
ROOT_PATH=/path/to/your/local/directory

# OPTIONAL: Port to run on (default: 2929)
PORT=2929
```

### Example Configurations

**Browse your Downloads folder:**

```bash
ROOT_PATH=/Users/yourname/Downloads
PORT=2929
```

**Browse an external drive:**

```bash
ROOT_PATH=/mnt/external-drive
PORT=9000
```

**Browse your entire home directory:**

```bash
ROOT_PATH=/Users/yourname
PORT=2929
```

## 🛠️ Development Setup

For local development without Docker:

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Install dependencies
npm install

# Copy environment template and edit
cp .env.example .env
sed -i '' 's|ROOT_PATH=/path/to/your/local/directory|ROOT_PATH=/absolute/path/you/want|' .env  # macOS (BSD sed)
# Linux users: sed -i 's|ROOT_PATH=/path/to/your/local/directory|ROOT_PATH=/absolute/path/you/want|' .env

# Start development server
npm run dev
```

## 📋 Docker Commands

```bash
docker compose up -d           # start
docker compose down            # stop
docker compose logs -f         # logs
docker compose build --no-cache  # rebuild images
git pull && docker compose up -d # update and restart
```

## 🏗️ Architecture

- **Next.js 15**: Modern React framework with App Router
- **nginx**: High-performance file serving with JSON directory listings
- **Docker**: Containerized deployment for easy setup
- **TypeScript**: Full type safety and developer experience

## 📁 Project Structure

```
nextbrowse/
├── app/                    # Next.js app directory
│   ├── api/fs/            # File system API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page component
├── components/            # React components
│   ├── FileList.tsx       # File grid/list display
│   ├── Toolbar.tsx        # Action toolbar
│   ├── Breadcrumbs.tsx    # Navigation breadcrumbs
│   └── ...                # Other UI components
├── lib/                   # Utility functions
├── docker-compose.yml     # Docker orchestration
├── nginx.conf            # nginx configuration
└── Dockerfile            # Container definition
```

## 🔧 Customization

### Port Configuration

Change the port by updating your `.env` file:

```bash
PORT=9000
```

### Directory Permissions

Ensure the directory you want to browse has appropriate read permissions:

```bash
chmod -R 755 /path/to/your/directory
```

### Security Considerations

- The application runs in a container with limited privileges
- Path traversal attacks are prevented
- Only the specified directory is accessible
- No external network access from the container

## 🐛 Troubleshooting

### Common Issues

**"ENOENT: no such file or directory"**

- Check that `ROOT_PATH` in `.env` points to an existing directory
- Verify directory permissions

**"Port already in use"**

- Change the `PORT` in `.env` to an unused port
- Check what's using the port: `lsof -i :2929`

**"Cannot access files"**

- Ensure the directory has read permissions
- Check Docker has access to the specified path

### Logs

```bash
# View all logs
docker compose logs

# View only nginx logs
docker compose logs nginx

# View only app logs
docker compose logs nextjs
```

## 📦 Prebuilt mode (no client builds)

To minimize CPU usage on user machines, the repository can include prebuilt artifacts:

- Backend: `backend/nextbrowse-backend` (Linux binary, committed)
- Frontend: `frontend/.next/standalone` and `frontend/.next/static` (committed)

When these are present, our scripts automatically use `docker-compose.prebuilt.yml` to run without building images locally. Otherwise, Docker will build images from source.

Maintainers: see the notes in CONTRIBUTING.md for how to create and update prebuilt artifacts.

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read CONTRIBUTING.md and open a Pull Request.

## ⭐ Support

If you find this project useful, please give it a star! ⭐

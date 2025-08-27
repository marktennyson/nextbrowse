# NextBrowse 📁

A modern, feature-rich file browser built with Next.js 15, designed to provide a web interface for browsing and managing files on your local machine through Docker and nginx.

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

## 🚀 Quick Start with Docker

### Prerequisites

- Docker and Docker Compose installed
- A local directory you want to browse

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

### 3. Run with Docker Compose

```bash
# Build and start the services
docker-compose up -d

# View logs (optional)
docker-compose logs -f
```

### 4. Access the Application

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
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Configure for local development
echo "ROOT_DIR=/path/to/your/directory" > .env.local
echo "PUBLIC_FILES_BASE=/files" >> .env.local
echo "NEXT_PUBLIC_BASE_URL=http://localhost:3000" >> .env.local

# Start development server
npm run dev
```

## 📋 Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild after code changes
docker-compose build --no-cache

# Update to latest version
git pull
docker-compose build --no-cache
docker-compose up -d
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
docker-compose logs

# View only nginx logs
docker-compose logs nginx

# View only app logs
docker-compose logs nextjs
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## ⭐ Support

If you find this project useful, please give it a star! ⭐

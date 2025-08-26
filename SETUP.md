# 🚀 NextBrowse Setup Guide

## Complete Docker Setup with nginx

You now have a complete Docker-based file browser setup! Here's everything you need to know:

## 📋 What's Included

### ✅ Complete Docker Stack
- **Next.js App**: Modern file browser interface
- **nginx**: High-performance file serving with JSON directory listings  
- **Docker Compose**: Orchestrated multi-container setup
- **Auto-configuration**: Minimal setup required

### ✅ Key Features
- Browse any local directory through web interface
- Upload, download, copy, move, delete files
- Grid/list view modes with search and sorting
- Drag & drop file uploads
- Responsive design for mobile/desktop
- Secure path traversal protection

## 🎯 Quick Start

### 1. Set Your Directory
Edit the `.env` file:
```bash
ROOT_PATH=/path/to/your/directory  # Set this to your desired directory
PORT=8080                          # Port for the web interface
```

### 2. Start the Application
```bash
# Option 1: Use the convenient startup script
./start.sh

# Option 2: Use Docker Compose directly  
docker-compose up -d
```

### 3. Access Your Files
- **Web Interface**: http://localhost:8080
- **Direct File Access**: http://localhost:8080/files/

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Your Browser  │────│    nginx     │────│   Next.js App  │
│  localhost:8080 │    │ (Port 8080)  │    │  (Port 3000)   │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Your Local Dir  │
                    │   (mounted as    │
                    │   /mnt/storage)  │
                    └──────────────────┘
```

## 🔧 Configuration Options

### Environment Variables (.env)
```bash
# REQUIRED: Local directory to browse
ROOT_PATH=/Users/yourname/Documents

# OPTIONAL: Port (default: 8080)
PORT=8080

# OPTIONAL: Host (default: localhost)
# HOST=0.0.0.0
```

### nginx Configuration
The `nginx.conf` is pre-configured with:
- JSON directory listings (`autoindex_format json`)
- File serving optimizations
- Security headers
- GZIP compression
- CORS headers for API access

## 📁 Example Configurations

**Browse Downloads:**
```bash
ROOT_PATH=/Users/yourname/Downloads
PORT=8080
```

**Browse External Drive:**
```bash
ROOT_PATH=/mnt/external-drive
PORT=9000
```

**Browse Project Files:**
```bash
ROOT_PATH=/home/user/projects
PORT=8080
```

## 🛠️ Management Commands

```bash
# Start services
docker-compose up -d

# Stop services  
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Rebuild after changes
docker-compose build --no-cache
docker-compose up -d
```

## 🐛 Troubleshooting

### Common Issues & Solutions

**🔴 "Directory not found"**
- Check `ROOT_PATH` in `.env` points to existing directory
- Verify directory permissions: `ls -la /path/to/directory`

**🔴 "Port already in use"**
- Change `PORT` in `.env` to unused port
- Find what's using port: `lsof -i :8080`

**🔴 "Docker not running"**
- Start Docker Desktop or Docker daemon
- Verify: `docker --version`

**🔴 "Permission denied"**
- Ensure directory is readable: `chmod -R 755 /path/to/directory`
- Check Docker has file system access permissions

### Debug Commands
```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs nextjs
docker-compose logs nginx

# Access container shell
docker-compose exec nextjs sh
```

## 🔒 Security Features

- **Path traversal protection**: Prevents accessing files outside ROOT_PATH
- **Container isolation**: App runs in isolated container environment
- **Non-root user**: Application runs as unprivileged user
- **Security headers**: nginx adds security headers to all responses
- **CORS protection**: Controlled cross-origin access

## 📊 Performance Features

- **nginx file serving**: Direct file serving bypasses Node.js for static files
- **Optimized caching**: Browser and proxy caching for static assets
- **GZIP compression**: Automatic compression for text-based files
- **Lazy loading**: Components load only when needed
- **Efficient builds**: Multi-stage Docker builds for smaller images

## 🎉 Ready to Go!

Your NextBrowse file browser is now ready! Simply:

1. ✅ Set your `ROOT_PATH` in `.env`
2. ✅ Run `./start.sh` or `docker-compose up -d`
3. ✅ Open http://localhost:8080 in your browser
4. ✅ Start browsing your files!

Enjoy your new web-based file browser! 🎊
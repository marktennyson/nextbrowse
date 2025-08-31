# 🚀 NextBrowse Setup Guide

## Complete Docker Setup with nginx

You now have a complete Docker-based file browser setup! Here's everything you need to know:

## 📋 What's Included

### ✅ Complete Docker Stack

- **Next.js App**: Modern file browser interface
- **nginx**: High-performance file serving with JSON directory listings
  docker compose logs -f
- **Auto-configuration**: Minimal setup required

### ✅ Key Features

- Browse any local directory through web interface
- Upload, download, copy, move, delete files
- Grid/list view modes with search and sorting
- Drag & drop file uploads
- Responsive design for mobile/desktop

## 🎯 Quick Start

### 1. Set Your Directory

```bash
ROOT_PATH=/path/to/your/directory  # Set this to your desired directory

### 2. Start the Application

./restart.sh
```

### 3. Access Your Files

- **Web Interface**: http://localhost:2929
- **Direct File Access**: http://localhost:2929/files/

docker compose logs nextjs
docker compose logs nginx

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Your Browser  │────│    nginx     │────│   Next.js App  │
│  localhost:2929 │    │ (Port 2929)  │    │  (Port 3000)   │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Your Local Dir  │
                    │   (mounted as    │
2. ✅ Run `./install.sh` then `./restart.sh` or `docker compose up -d`
                    └──────────────────┘
```

## 🔧 Configuration Options

### Environment Variables (.env)

```bash
# REQUIRED: Local directory to browse
ROOT_PATH=/Users/yourname/Documents

# OPTIONAL: Port (default: 2929)
PORT=2929

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
PORT=2929
```

**Browse External Drive:**

```bash
ROOT_PATH=/mnt/external-drive
PORT=9000
```

**Browse Project Files:**

```bash
ROOT_PATH=/home/user/projects
PORT=2929
```

## 🛠️ Management Commands

```bash
# Start services
docker compose up -d
docker compose down
docker compose logs -f
docker compose restart
docker compose build --no-cache && docker compose up -d
```

## 🐛 Troubleshooting

### Common Issues & Solutions

**🔴 "Directory not found"**

- Check `ROOT_PATH` in `.env` points to existing directory
- Verify directory permissions: `ls -la /path/to/directory`

**🔴 "Port already in use"**

- Change `PORT` in `.env` to unused port
- Find what's using port: `lsof -i :2929`

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
2. ✅ Run `./restart.sh` or `docker compose up -d`
3. ✅ Open http://localhost:2929 in your browser
4. ✅ Start browsing your files!

Enjoy your new web-based file browser! 🎊

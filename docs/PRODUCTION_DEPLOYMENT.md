# Production Deployment Guide

This guide covers deploying NextBrowse in production environments with security, performance, and reliability best practices.

## Prerequisites

- Docker and Docker Compose
- Reverse proxy (nginx, Traefik, or similar)
- SSL/TLS certificates
- Monitoring and logging infrastructure

## Production Configuration

### 1. Environment Configuration

Create a production `.env` file:

```bash
# Production Environment
ENVIRONMENT=production
APP_VERSION=1.0.0

# File system configuration
ROOT_PATH=/app/data
MAX_FILE_SIZE=10737418240
MAX_UPLOAD_SIZE=53687091200

# Network configuration
PORT=2929
NEXT_PUBLIC_BASE_URL=https://files.yourdomain.com

# Security configuration
ALLOWED_ORIGINS=https://files.yourdomain.com,https://yourdomain.com

# Rate limiting (optional)
RATE_LIMIT_REQUESTS=500
RATE_LIMIT_WINDOW=60
```

### 2. Docker Compose Production Setup

Use the provided `docker-compose.yml` with these production considerations:

```yaml
services:
  go-backend:
    # Production-specific overrides
    environment:
      - ENVIRONMENT=production
      - GIN_MODE=release
    deploy:
      replicas: 2  # For high availability
      resources:
        limits:
          memory: 1G
          cpus: '2.0'
        reservations:
          memory: 256M
          cpus: '0.5'
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 3. Reverse Proxy Configuration

#### Nginx Configuration

```nginx
upstream nextbrowse {
    server 127.0.0.1:2929;
    # Add more servers for load balancing
    # server 127.0.0.1:2930;
}

server {
    listen 443 ssl http2;
    server_name files.yourdomain.com;
    
    # SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    # Client settings
    client_max_body_size 10G;
    client_body_timeout 120s;
    client_header_timeout 60s;
    
    location / {
        proxy_pass http://nextbrowse;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
    
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://nextbrowse;
        # ... same proxy settings as above
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name files.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Security Hardening

### 1. File System Security

```bash
# Create dedicated user
sudo useradd -r -s /bin/false nextbrowse

# Set proper permissions
sudo chown -R nextbrowse:nextbrowse /app/data
sudo chmod 755 /app/data

# SELinux (if applicable)
sudo setsebool -P httpd_can_network_connect 1
```

### 2. Firewall Configuration

```bash
# UFW example
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 2929/tcp  # Block direct access to app
sudo ufw enable
```

### 3. Container Security

Update `docker-compose.yml` for production:

```yaml
services:
  nextbrowse:
    security_opt:
      - no-new-privileges:true
      - apparmor:docker-default
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
    read_only: true
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=100m
```

## Monitoring and Logging

### 1. Health Monitoring

```yaml
# docker-compose monitoring
services:
  nextbrowse:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:2929/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 2. Log Management

```yaml
# Centralized logging
services:
  nextbrowse:
    logging:
      driver: "fluentd"
      options:
        fluentd-address: "localhost:24224"
        tag: "nextbrowse"
```

### 3. Metrics Collection

Access metrics endpoint: `GET /metrics`

Example monitoring with Prometheus:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'nextbrowse'
    static_configs:
      - targets: ['localhost:2929']
    metrics_path: '/metrics'
```

## Backup Strategy

### 1. Data Backup

```bash
#!/bin/bash
# backup-nextbrowse.sh

BACKUP_DIR="/backups/nextbrowse"
DATA_DIR="/app/data"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
rsync -av "$DATA_DIR/" "$BACKUP_DIR/data_$DATE/"

# Compress old backups
find "$BACKUP_DIR" -name "data_*" -type d -mtime +7 -exec tar -czf {}.tar.gz {} \; -exec rm -rf {} \;

# Remove old compressed backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
```

### 2. Configuration Backup

```bash
# Backup docker-compose and environment files
cp docker-compose.yml /backups/config/
cp .env /backups/config/
cp nginx.conf /backups/config/
```

## Performance Optimization

### 1. Caching Strategy

```nginx
# Static file caching
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# API response caching (for appropriate endpoints)
location /api/fs/list {
    proxy_cache nextbrowse_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_key "$scheme$request_method$host$request_uri";
}
```

### 2. Resource Limits

```yaml
# docker-compose.yml
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '2.0'
    reservations:
      memory: 512M
      cpus: '0.5'
```

## Disaster Recovery

### 1. High Availability Setup

```yaml
# docker-compose-ha.yml
services:
  nextbrowse-1:
    # ... configuration
    ports:
      - "2929:80"
  
  nextbrowse-2:
    # ... configuration
    ports:
      - "2930:80"
  
  nginx:
    # Load balancer configuration
```

### 2. Database Backup (if using external storage)

```bash
# If using external database
pg_dump nextbrowse > /backups/db/nextbrowse_$(date +%Y%m%d).sql
```

## Troubleshooting

### 1. Common Issues

**High Memory Usage:**
```bash
# Check container stats
docker stats

# Adjust memory limits in docker-compose.yml
```

**Slow File Operations:**
```bash
# Check disk I/O
iotop

# Consider using SSD storage
# Adjust nginx buffer sizes
```

**Connection Timeouts:**
```bash
# Check logs
docker-compose logs

# Adjust timeout values in nginx and docker-compose
```

### 2. Log Analysis

```bash
# Application logs
docker-compose logs -f nextbrowse

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs
journalctl -u docker
```

## Maintenance

### 1. Regular Updates

```bash
#!/bin/bash
# update-nextbrowse.sh

# Pull latest images
docker-compose pull

# Restart services with zero-downtime
docker-compose up -d --remove-orphans

# Clean up old images
docker image prune -f
```

### 2. Health Checks

```bash
#!/bin/bash
# health-check.sh

# Check service status
curl -f http://localhost:2929/health || exit 1

# Check metrics
curl -s http://localhost:2929/metrics | grep -q "go_info" || exit 1

echo "Health check passed"
```

## Support

For production support:
- Review logs first: `docker-compose logs`
- Check the [Troubleshooting Guide](../README.md#troubleshooting)
- Open an issue on GitHub with system information and logs
- Consider professional support options if available
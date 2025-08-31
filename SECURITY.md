# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Features

NextBrowse has been built with security as a primary concern:

### Backend Security
- **Path Traversal Protection**: All file paths are validated and sanitized to prevent directory traversal attacks
- **Input Validation**: Comprehensive validation of all user inputs
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Security Headers**: Proper HTTP security headers (CSP, HSTS, etc.)
- **Non-root Execution**: Docker containers run as non-root users
- **Read-only Filesystem**: Docker containers use read-only filesystems where possible

### Frontend Security
- **XSS Protection**: React's built-in XSS protection plus additional sanitization
- **CSRF Protection**: Cross-site request forgery protection
- **Content Security Policy**: Strict CSP headers
- **Error Boundaries**: Proper error handling to prevent information leakage

### Infrastructure Security
- **Container Security**: Minimal Docker images with security scanning
- **Network Isolation**: Proper container networking and isolation
- **Health Checks**: Comprehensive health monitoring
- **Graceful Shutdown**: Proper signal handling and resource cleanup

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### 1. Do Not Create Public Issues
Please **DO NOT** create GitHub issues for security vulnerabilities as they are visible to everyone.

### 2. Report Privately
Send an email to: **security@nextbrowse.com** (if available, otherwise use the maintainer's email)

Include the following information:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Any suggested fixes (if you have them)

### 3. Response Timeline
- **Initial Response**: We will respond within 48 hours
- **Investigation**: We will investigate and assess the vulnerability within 5 business days
- **Fix**: Critical vulnerabilities will be patched within 7 days, others within 30 days
- **Disclosure**: We will coordinate with you on responsible disclosure

### 4. Coordinated Disclosure
- We prefer coordinated disclosure and will work with you to ensure the vulnerability is properly addressed
- We will credit you in the security advisory (unless you prefer to remain anonymous)
- We may offer a small bounty for critical vulnerabilities (if budget allows)

## Security Best Practices for Deployment

### Environment Configuration
- Use strong, unique passwords and API keys
- Limit file system access to only necessary directories
- Run behind a reverse proxy (nginx, Apache, etc.)
- Use HTTPS in production
- Regularly update all dependencies

### Docker Security
```yaml
# Example secure docker-compose configuration
services:
  nextbrowse:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp:rw,noexec,nosuid
```

### Network Security
- Use firewalls to restrict access
- Consider VPN access for sensitive deployments
- Monitor access logs regularly
- Implement fail2ban or similar intrusion prevention

### File System Security
- Set appropriate file permissions (755 for directories, 644 for files)
- Use dedicated user account for file access
- Regularly audit file access patterns
- Consider encrypted storage for sensitive files

## Security Scanning

We regularly scan our codebase for vulnerabilities using:
- **Trivy**: Container image scanning
- **Go Sec**: Go code security analysis
- **npm audit**: Frontend dependency scanning
- **CodeQL**: Static analysis security testing

## Security Updates

Security updates are released as patch versions and are backwards compatible. We strongly recommend keeping NextBrowse updated to the latest version.

Subscribe to security announcements:
- Watch this repository for security advisories
- Follow our security mailing list (if available)

## Acknowledgments

We would like to thank the following security researchers who have helped make NextBrowse more secure:

<!-- This section will be updated as we receive security reports -->

---

For general questions about security, please reach out to the maintainers through the project's issue tracker (for non-sensitive matters only).
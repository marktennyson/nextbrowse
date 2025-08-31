# -------------------
# Build stage
# -------------------
FROM golang:1.23-alpine AS builder

# Install security updates and build tools
RUN apk update && apk upgrade && apk add --no-cache \
    git \
    ca-certificates \
    tzdata

# Create app directory
WORKDIR /app

# Copy go.mod and go.sum first for better caching
COPY go.mod go.sum ./

# Download dependencies with verification
RUN go mod download && go mod verify

# Copy source code
COPY . .

# Clean up unused dependencies
RUN go mod tidy

# Build the application with security flags
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags='-w -s -extldflags "-static"' \
    -a -installsuffix cgo \
    -tags netgo,osusergo \
    -o main .

# -------------------
# Production stage
# -------------------
FROM scratch

# Copy timezone data and CA certificates from builder
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

# Copy the binary
COPY --from=builder /app/main /app/main

# Create non-root user in scratch
# Use numeric IDs since we can't use RUN in scratch
USER 65534:65534

# Expose app port
EXPOSE 9932

# Set environment
ENV ENVIRONMENT=production
ENV GIN_MODE=release

# Health check (Note: scratch images don't have shell commands, so we rely on docker-compose health check)
# The health check will be handled by docker-compose or kubernetes

# Run the application
ENTRYPOINT ["/app/main"]

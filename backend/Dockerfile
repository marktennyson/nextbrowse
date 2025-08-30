# -------------------
# Build stage
# -------------------
FROM golang:1.22-alpine AS builder

# Set working directory
WORKDIR /app

# Install required tools
RUN apk add --no-cache git

# Copy go.mod and go.sum first (better caching)
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the rest of the source code
COPY . .

# Ensure go.sum is up to date (fixes missing deps like ttlcache/v3)
RUN go mod tidy

# Build the application binary
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# -------------------
# Production stage
# -------------------
FROM alpine:latest

# Install CA certificates for HTTPS requests
RUN apk --no-cache add ca-certificates wget

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/main .

# Fix ownership
RUN chown appuser:appgroup /app/main

# Switch to non-root
USER appuser

# Expose app port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the application
CMD ["./main"]

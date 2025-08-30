# -------------------
# Production stage using pre-built binary
# -------------------
FROM alpine:latest

# Install CA certificates for HTTPS requests
RUN apk --no-cache add ca-certificates wget

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Set working directory
WORKDIR /app

# Copy pre-built binary (built locally and committed to git)
COPY nextbrowse-backend ./main

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

# syntax=docker/dockerfile:1.6

# ---- deps: fresh lock on target platform; compile fallback enabled ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Set security and performance environment variables
ENV NODE_ENV=development \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_PROGRESS=false \
    NPM_CONFIG_LOGLEVEL=error \
    NEXT_TELEMETRY_DISABLED=1

# Install system dependencies with security updates
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    ca-certificates \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN --mount=type=cache,target=/root/.npm \
    npm ci \
    && npm audit fix --audit-level=high || true

# ---- builder ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Set production environment
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    ENVIRONMENT=production

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy dependencies and package files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package-lock.json ./package-lock.json

# Rebuild native dependencies for the target architecture
RUN npm rebuild

# Copy source code (exclude sensitive files)
COPY package.json tsconfig.json next.config.js tailwind.config.js postcss.config.mjs ./
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY hooks ./hooks
COPY public ./public

# Build the application with optimization
RUN npm run build

# Remove development dependencies after build
RUN npm prune --production

# ---- runner: lean, secure production image ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    ENVIRONMENT=production

# Install security updates
RUN apt-get update && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    tini \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user with minimal privileges
RUN groupadd -g 1001 nodejs \
    && useradd -r -u 1001 -g nodejs -s /bin/false -c "Next.js User" nextjs

# Copy built application with proper ownership
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs --from=builder /app/public ./public

# Create directories with proper permissions
RUN mkdir -p /app/static /tmp/.next \
    && chown -R nextjs:nodejs /app/static /tmp/.next \
    && chmod 755 /app/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]

# ---- Deps ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
ENV NODE_ENV=development \
    NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false NPM_CONFIG_PROGRESS=false
# Install system deps only if you need them (kept lean by default)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---- Builder ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Runner ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# non-root user
RUN groupadd -g 1001 nodejs && useradd -r -u 1001 -g nodejs nextjs

# Copy the minimal standalone output
# .next/standalone contains the server + required node_modules
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./ 
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs --from=builder /app/public ./public

# Storage mount point for your volume
RUN mkdir -p /mnt/storage && chown nextjs:nodejs /mnt/storage

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

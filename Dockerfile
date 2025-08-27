# syntax=docker/dockerfile:1.6

# ---- deps: fresh lock on target platform; compile fallback enabled ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
ENV NODE_ENV=development \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_PROGRESS=false

# Toolchain only here, so lightningcss can compile if prebuilt isn't fetched
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates build-essential python3 pkg-config curl git \
    cargo rustc \
  && rm -rf /var/lib/apt/lists/*

# Copy ONLY package.json so we resolve cleanly for this platform
COPY package.json ./
# Fresh install generates a NEW lock; include optional so lightningcss binary is pulled
RUN --mount=type=cache,target=/root/.npm npm install --include=optional

# ---- builder ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package-lock.json ./package-lock.json
COPY . .
RUN npm run build

# ---- runner: lean, no npm install ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd -g 1001 nodejs && useradd -r -u 1001 -g nodejs nextjs

# Copy minimal standalone server + static assets
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs --from=builder /app/public ./public

# Storage mount point
RUN mkdir -p /app/static && chown nextjs:nodejs /app/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

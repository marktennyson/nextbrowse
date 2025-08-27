# ---- Base (for shared packages/tools) ----
FROM node:20-alpine AS base
WORKDIR /app
# For next/image (sharp) on Alpine
RUN apk add --no-cache libc6-compat

# ---- Deps (install full deps for build) ----
FROM base AS deps
# Copy lockfile for reproducible installs
COPY package.json package-lock.json ./
RUN npm ci

# ---- Builder (build Next.js) ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Copy the rest of the source
COPY . .
# Build the app
RUN npm run build

# ---- Runner (production image) ----
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy only what's needed to run
COPY --chown=nextjs:nodejs package.json package-lock.json ./
# Install production deps only
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

# Storage mount point (matches your compose volume)
RUN mkdir -p /mnt/storage && chown nextjs:nodejs /mnt/storage

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Optional: disable Next telemetry in containers
ENV NEXT_TELEMETRY_DISABLED=1

USER nextjs
EXPOSE 3000

# Ensure your package.json has: "start": "next start -p 3000"
CMD ["npm", "start"]

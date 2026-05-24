# syntax=docker/dockerfile:1.7

# =====================================================================
# 1) Dependency layer — installs production+dev deps for the build
# =====================================================================
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod=false


# =====================================================================
# 2) Build layer — runs `pnpm build` (produces .next/standalone)
# =====================================================================
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable

# Build-time public URL used by the mobile QR code component.
# Because the variable is NEXT_PUBLIC_*, its value is baked into the client
# bundle at build time — it cannot be supplied as a runtime env var.
ARG NEXT_PUBLIC_PUBLIC_URL=""
ENV NEXT_PUBLIC_PUBLIC_URL=$NEXT_PUBLIC_PUBLIC_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build


# =====================================================================
# 3) Runtime layer — minimal image, only the standalone artifact + static
# =====================================================================
FROM node:22-alpine AS runner
WORKDIR /app

# tini reaps zombies and forwards SIGTERM properly, so `docker stop` exits clean
RUN apk add --no-cache tini

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# User data (users.json, conversations.json, ...) lives here. The default
# Docker compose mounts a named volume at this path.
ENV AMIBA_DATA_DIR=/app/data

# Non-root user for security; pre-create the data dir so the volume mount
# inherits correct ownership when first created.
RUN addgroup -g 1001 -S nodejs \
 && adduser -S nextjs -u 1001 \
 && mkdir -p /app/data \
 && chown -R nextjs:nodejs /app

# Next.js standalone output bundles its own minimal node_modules + server.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

# Healthcheck uses Node 22 built-in fetch — no need to install wget/curl.
# Container is healthy as long as /login responds with any < 500 status.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r => process.exit(r.status < 500 ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]

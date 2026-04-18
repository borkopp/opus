# syntax=docker/dockerfile:1
# Build context must be the repo root (.) so the convex symlink can be resolved.

ARG NODE_VERSION=22-slim

# ── 1. Install dependencies ────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

COPY opus-mk/package.json opus-mk/package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# ── 2. Build ───────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

# NEXT_PUBLIC_* vars are inlined at build time — they MUST be ARGs here
ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_CONVEX_SITE_URL

ENV NEXT_PUBLIC_CONVEX_URL=${NEXT_PUBLIC_CONVEX_URL}
ENV NEXT_PUBLIC_CONVEX_SITE_URL=${NEXT_PUBLIC_CONVEX_SITE_URL}
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
# Copy app source (excluding the convex symlink)
COPY opus-mk/ .
# Copy the real convex directory, resolving the symlink
COPY opus-dashboard/convex/ ./convex/

RUN npm run build

# ── 3. Runtime ─────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

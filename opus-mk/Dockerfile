# syntax=docker/dockerfile:1
# Build context must be the repo root (.) so opus-dashboard/convex is reachable.
# We mirror the dev repo layout inside the image (/app/opus-mk + /app/opus-dashboard/convex
# with a symlink at /app/opus-mk/convex) because next.config.ts sets
# outputFileTracingRoot to the parent directory.

ARG NODE_VERSION=22-slim

# ── 1. Install dependencies ────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
WORKDIR /app/opus-mk

COPY opus-mk/package.json opus-mk/package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# ── 2. Build ───────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_CONVEX_SITE_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_DASHBOARD_URL
ARG NEXT_PUBLIC_MAPBOX_TOKEN

ENV NEXT_PUBLIC_CONVEX_URL=${NEXT_PUBLIC_CONVEX_URL}
ENV NEXT_PUBLIC_CONVEX_SITE_URL=${NEXT_PUBLIC_CONVEX_SITE_URL}
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_DASHBOARD_URL=${NEXT_PUBLIC_DASHBOARD_URL}
ENV NEXT_PUBLIC_MAPBOX_TOKEN=${NEXT_PUBLIC_MAPBOX_TOKEN}
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Mirror the dev layout: opus-mk and opus-dashboard as siblings under /app
COPY --from=deps /app/opus-mk/node_modules ./opus-mk/node_modules
COPY opus-mk/ ./opus-mk/
COPY opus-dashboard/convex/ ./opus-dashboard/convex/

# Recreate the symlink (Docker copied it as a literal broken link from the source repo)
RUN rm -rf ./opus-mk/convex && ln -s ../opus-dashboard/convex ./opus-mk/convex

# Convex's generated client lives at /app/opus-dashboard/convex/_generated/api.js
# and itself imports "convex/server". With outputFileTracingRoot=/app, Turbopack
# walks node_modules upward from that file's location, so make node_modules
# reachable at the workspace root.
RUN ln -s opus-mk/node_modules ./node_modules

WORKDIR /app/opus-mk
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

# The standalone bundle preserves the parent-tracing-root layout, so it already
# contains opus-mk/server.js plus any external files Next.js traced.
COPY --from=builder --chown=nextjs:nodejs /app/opus-mk/public ./opus-mk/public
COPY --from=builder --chown=nextjs:nodejs /app/opus-mk/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/opus-mk/.next/static ./opus-mk/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "opus-mk/server.js"]

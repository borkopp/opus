#!/usr/bin/env bash
# Redeploy the OPUS stack on this Pi.
#
# Usage:
#   ./redeploy.sh                # git pull + build apps + convex deploy + restart
#   ./redeploy.sh --no-pull      # skip git pull (deploy current working tree)
#   ./redeploy.sh --skip-build   # skip docker image rebuild
#   ./redeploy.sh --skip-convex  # skip pushing convex functions
#   ./redeploy.sh --only dashboard  # rebuild & restart just opus-dashboard
#   ./redeploy.sh --only mk         # rebuild & restart just opus-mk
#
# Flags compose: e.g. `./redeploy.sh --no-pull --skip-convex --only mk`.

set -euo pipefail

cd /opt/opus

# ── Config ────────────────────────────────────────────────────────────────────
COMPOSE_FILE="docker-compose.pi.yml"
CONVEX_URL="http://127.0.0.1:3210"
# shellcheck disable=SC1091
source /opt/opus/.env.deploy   # provides CONVEX_SELF_HOSTED_ADMIN_KEY

# ── Args ──────────────────────────────────────────────────────────────────────
DO_PULL=1
DO_BUILD=1
DO_CONVEX=1
ONLY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-pull)     DO_PULL=0 ;;
    --skip-build)  DO_BUILD=0 ;;
    --skip-convex) DO_CONVEX=0 ;;
    --only)        ONLY="$2"; shift ;;
    -h|--help)     sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
  shift
done

case "$ONLY" in
  ""|dashboard|mk) ;;
  *) echo "--only must be 'dashboard' or 'mk'" >&2; exit 2 ;;
esac

log() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }

# ── 1. Pull latest code ───────────────────────────────────────────────────────
if [[ $DO_PULL -eq 1 ]]; then
  log "git pull"
  git pull --ff-only
fi

# ── 2. Rebuild app images ─────────────────────────────────────────────────────
if [[ $DO_BUILD -eq 1 ]]; then
  log "build images (this takes a while on the Pi)"
  if [[ -n "$ONLY" ]]; then
    docker compose -f "$COMPOSE_FILE" build "opus-$ONLY"
  else
    docker compose -f "$COMPOSE_FILE" build opus-dashboard opus-mk
  fi
fi

# ── 3. Deploy Convex functions ────────────────────────────────────────────────
# Skipped automatically when --only mk (mk has no Convex code).
if [[ $DO_CONVEX -eq 1 && "$ONLY" != "mk" ]]; then
  log "deploy convex functions to self-hosted backend"
  docker run --rm --network host \
    -v /opt/opus/opus-dashboard:/work -w /work \
    -e CONVEX_SELF_HOSTED_URL="$CONVEX_URL" \
    -e CONVEX_SELF_HOSTED_ADMIN_KEY="$CONVEX_SELF_HOSTED_ADMIN_KEY" \
    node:22-slim sh -c "npx convex deploy -y"
fi

# ── 4. Restart containers ─────────────────────────────────────────────────────
log "restart containers"
if [[ -n "$ONLY" ]]; then
  docker compose -f "$COMPOSE_FILE" up -d --no-deps "opus-$ONLY"
else
  docker compose -f "$COMPOSE_FILE" up -d
fi

# ── 5. Cleanup + status ───────────────────────────────────────────────────────
log "prune dangling images"
docker image prune -f >/dev/null

log "container status"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

log "done — public endpoints"
printf '  https://app.opus.mk\n  https://dashboard.opus.mk\n  https://api.opus.mk\n  https://sites.opus.mk\n'

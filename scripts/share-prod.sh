#!/usr/bin/env bash
#
# Share a PRODUCTION build of Paperpiece from your PC over one free Cloudflare
# tunnel. Much faster than the dev share: the web is built as a static site and
# served by the game server on the SAME origin, so there's one URL, no CORS, and
# the browser connects to the same host it loaded from.
#
# Usage:   ./scripts/share-prod.sh            # reuse existing build if present
#          ./scripts/share-prod.sh --rebuild  # force a fresh build (after code changes)
# Stop:    Ctrl-C
#
# Notes: your PC must stay awake with this terminal open. The URL changes each
# run, but the build does NOT need rebuilding for a new URL (it's same-origin).

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CF="${CLOUDFLARED:-$HOME/.local/bin/cloudflared}"
command -v "$CF" >/dev/null 2>&1 || CF="$(command -v cloudflared || true)"
if [ -z "${CF:-}" ] || ! "$CF" --version >/dev/null 2>&1; then
  echo "❌ cloudflared not found. Install (macOS): "
  echo "   mkdir -p ~/.local/bin && curl -sSL -o /tmp/cf.tgz https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz && tar -xzf /tmp/cf.tgz -C ~/.local/bin && chmod +x ~/.local/bin/cloudflared"
  exit 1
fi

cleanup() {
  echo ""; echo "Stopping server + tunnel…"
  pkill -f "cloudflared tunnel" 2>/dev/null || true
  pkill -f "apps/server/dist/index.js" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Cleaning previous run (dev servers / tunnels)…"
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
pkill -f "tsx watch src/index.ts" 2>/dev/null || true
pkill -f "turbo run dev" 2>/dev/null || true
cleanup 2>/dev/null
sleep 2

REBUILD="${1:-}"
if [ "$REBUILD" = "--rebuild" ] || [ ! -f apps/web/out/index.html ]; then
  echo "Building web (static export, same-origin)…"
  # No NEXT_PUBLIC_SERVER_URL → client uses the origin it's served from.
  ( unset NEXT_PUBLIC_SERVER_URL; STATIC_EXPORT=1 npm run build --workspace=@paperpiece/web ) || { echo "web build failed"; exit 1; }
fi
if [ "$REBUILD" = "--rebuild" ] || [ ! -f apps/server/dist/index.js ]; then
  echo "Building server…"
  npm run build --workspace=@paperpiece/server || { echo "server build failed"; exit 1; }
fi

echo "Starting production server on :4000 (serving the web app + game)…"
NODE_ENV=production PORT=4000 STATIC_DIR="$ROOT/apps/web/out" \
  node apps/server/dist/index.js > /tmp/pp-prod-server.log 2>&1 &

for _ in $(seq 1 30); do
  curl -sf http://localhost:4000/api/health >/dev/null 2>&1 && break
  sleep 1
done
if ! curl -sf http://localhost:4000/api/health >/dev/null 2>&1; then
  echo "❌ server didn't come up — see /tmp/pp-prod-server.log"; tail -20 /tmp/pp-prod-server.log; exit 1
fi

echo "Opening tunnel…"
"$CF" tunnel --url http://localhost:4000 > /tmp/pp-cf.log 2>&1 &
URL=""
for _ in $(seq 1 40); do
  URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/pp-cf.log | head -1 || true)"
  [ -n "$URL" ] && break
  sleep 1
done
[ -z "$URL" ] && { echo "❌ could not get tunnel URL — see /tmp/pp-cf.log"; exit 1; }

LAN="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"

echo ""
echo "────────────────────────────────────────────────────────────"
echo "  🌍  INTERNET (any friend):   $URL"
if [ -n "$LAN" ]; then
  echo "  ⚡  SAME WI-FI (lowest lag): http://$LAN:4000"
fi
echo "────────────────────────────────────────────────────────────"
echo "  Same-WiFi friends should use the LAN link — it skips Cloudflare"
echo "  entirely (near-zero lag). Remote friends use the internet link."
echo "  (production build · single origin · Ctrl-C to stop)"
echo ""

wait

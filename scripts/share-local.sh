#!/usr/bin/env bash
#
# Share your locally-running Paperpiece over the internet for free using
# Cloudflare Quick Tunnels (no account needed). Opens a tunnel for the web app
# and one for the game server, wires them together, starts the dev servers, and
# prints the public URL to share.
#
# Usage:  ./scripts/share-local.sh
# Stop:   Ctrl-C  (kills the tunnels + dev servers)
#
# Notes:
#  - Your PC must stay awake and this terminal open while friends are playing.
#  - Free/quick-tunnel URLs change every run — that's fine, this script rewires
#    everything automatically; just share the URL it prints.
#  - It does NOT modify your .env; it passes the tunnel URLs via the environment.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CF="${CLOUDFLARED:-$HOME/.local/bin/cloudflared}"
command -v "$CF" >/dev/null 2>&1 || CF="$(command -v cloudflared || true)"
if [ -z "${CF:-}" ] || ! "$CF" --version >/dev/null 2>&1; then
  echo "❌ cloudflared not found. Install it (macOS, no Homebrew):"
  echo "   mkdir -p ~/.local/bin && curl -sSL -o /tmp/cf.tgz \\"
  echo "     https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz \\"
  echo "     && tar -xzf /tmp/cf.tgz -C ~/.local/bin && chmod +x ~/.local/bin/cloudflared"
  exit 1
fi

cleanup() {
  echo ""
  echo "Stopping tunnels + dev servers…"
  pkill -f "cloudflared tunnel" 2>/dev/null || true
  pkill -f "next dev" 2>/dev/null || true
  pkill -f "next-server" 2>/dev/null || true
  pkill -f "tsx watch src/index.ts" 2>/dev/null || true
  pkill -f "turbo run dev" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Cleaning up any previous run…"
cleanup 2>/dev/null
sleep 2

open_tunnel() {
  local port="$1" logf="$2" url=""
  "$CF" tunnel --url "http://localhost:${port}" >"$logf" 2>&1 &
  for _ in $(seq 1 40); do
    url="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$logf" | head -1 || true)"
    [ -n "$url" ] && break
    sleep 1
  done
  printf '%s' "$url"
}

echo "Opening game-server tunnel (:4000)…"
SERVER_URL="$(open_tunnel 4000 /tmp/pp-cf-server.log)"
echo "Opening web tunnel (:3000)…"
WEB_URL="$(open_tunnel 3000 /tmp/pp-cf-web.log)"

if [ -z "$SERVER_URL" ] || [ -z "$WEB_URL" ]; then
  echo "❌ Could not obtain tunnel URLs. See /tmp/pp-cf-server.log and /tmp/pp-cf-web.log"
  exit 1
fi

export NEXT_PUBLIC_SERVER_URL="$SERVER_URL"
export CORS_ORIGIN="$WEB_URL"

echo ""
echo "────────────────────────────────────────────────────────────"
echo "  backend tunnel : $SERVER_URL"
echo "  web tunnel     : $WEB_URL"
echo ""
echo "  🎮  SHARE THIS LINK:  $WEB_URL"
echo "────────────────────────────────────────────────────────────"
echo ""
echo "Starting dev servers… (first page load compiles, ~10s). Ctrl-C to stop."
echo ""

npm run dev

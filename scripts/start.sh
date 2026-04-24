#!/usr/bin/env bash
# Start AppraiseOS in production mode.
#
# By default the app listens on 0.0.0.0:3000 so you can access it from your
# phone on the same WiFi — useful on-site. To restrict to this laptop only,
# set HOST=127.0.0.1.
#
# Usage:  ./scripts/start.sh
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f ".next/BUILD_ID" ]; then
  echo "❌ No production build found."
  echo "   Run ./scripts/install.sh first (it installs deps and builds the app)."
  exit 1
fi

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-3000}"
export NODE_ENV="production"
export HOST PORT

# Try to detect the LAN IP to display in the banner.
LAN_IP=""
if command -v ipconfig >/dev/null 2>&1; then
  # macOS-first: pick the active Wi-Fi address.
  LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
elif command -v hostname >/dev/null 2>&1; then
  LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "")
fi

cat <<BANNER

  ╭─────────────────────────────────────────────╮
  │                                             │
  │   AppraiseOS is starting...                 │
  │                                             │
  │   On this computer:  http://localhost:${PORT}  │
$( [ -n "$LAN_IP" ] && printf '  │   From phone / iPad: http://%-15s │\n' "$LAN_IP:$PORT" )
  │                                             │
  │   Press Ctrl-C to stop.                     │
  │                                             │
  ╰─────────────────────────────────────────────╯

BANNER

# npx next start honors PORT and HOSTNAME; we pass -H explicitly for clarity.
if command -v pnpm >/dev/null 2>&1 && [ -f "pnpm-lock.yaml" ]; then
  exec pnpm exec next start -p "$PORT" -H "$HOST"
else
  exec npx next start -p "$PORT" -H "$HOST"
fi

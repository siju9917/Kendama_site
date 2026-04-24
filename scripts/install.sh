#!/usr/bin/env bash
# One-shot installer for AppraiseOS on macOS or Linux.
# - Checks Node >= 20
# - Installs dependencies (npm, pnpm, or yarn, whichever is around)
# - Builds the production bundle
# - Prepares data/ and uploads/ directories
#
# Usage:  ./scripts/install.sh
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is not installed."
  echo "   Install Node 20 LTS from https://nodejs.org/en/download and re-run this script."
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "❌ Node.js $NODE_MAJOR is too old. AppraiseOS needs Node 20 or newer."
  echo "   Upgrade at https://nodejs.org/en/download, or use nvm: 'nvm install 20 && nvm use 20'."
  exit 1
fi

echo "✓ Node $(node -v)"

# Pick the first available package manager.
if command -v pnpm >/dev/null 2>&1; then
  PM="pnpm"
elif command -v npm >/dev/null 2>&1; then
  PM="npm"
else
  echo "❌ Neither pnpm nor npm found. Install Node (which ships with npm) first."
  exit 1
fi
echo "✓ Using $PM"

echo "→ Installing dependencies..."
if [ "$PM" = "pnpm" ]; then
  pnpm install
else
  npm install --legacy-peer-deps
fi

# Ensure better-sqlite3 native binding is present (npm/pnpm install sometimes
# skips post-install scripts for security).
if [ "$PM" = "pnpm" ]; then
  SQLITE_DIR="node_modules/.pnpm/better-sqlite3@"*"/node_modules/better-sqlite3"
else
  SQLITE_DIR="node_modules/better-sqlite3"
fi

# shellcheck disable=SC2086
if ! ls $SQLITE_DIR/build/Release/better_sqlite3.node >/dev/null 2>&1; then
  echo "→ Building better-sqlite3 native binding..."
  # shellcheck disable=SC2086
  (cd $SQLITE_DIR && npx prebuild-install) || {
    echo "  Prebuild failed, falling back to a full rebuild..."
    # shellcheck disable=SC2086
    (cd $SQLITE_DIR && npx node-gyp rebuild --release)
  }
fi

mkdir -p data uploads backups

echo "→ Building production bundle..."
if [ "$PM" = "pnpm" ]; then
  pnpm build
else
  npm run build
fi

echo ""
echo "✅ Install complete."
echo ""
echo "To start the app:          ./scripts/start.sh"
echo "To back up data:           ./scripts/backup.sh"
echo "To start on every login:   ./scripts/install-autostart-mac.sh"

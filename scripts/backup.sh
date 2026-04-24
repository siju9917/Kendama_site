#!/usr/bin/env bash
# Snapshot the SQLite database + the uploads directory into a timestamped
# zip under ./backups/. Safe to run while the app is live (uses SQLite's
# online .backup command, which is crash-consistent).
#
# Run manually, or set up a daily cron:
#   crontab -e
#   0 2 * * *  cd /path/to/appraise-os && ./scripts/backup.sh >>backups/backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."

mkdir -p backups
STAMP=$(date +%Y-%m-%d_%H%M%S)
DB_SNAPSHOT="backups/app-${STAMP}.db"

if [ ! -f "data/app.db" ]; then
  echo "No database to back up at data/app.db. Nothing to do."
  exit 0
fi

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "sqlite3 CLI not found — falling back to a file copy (not crash-safe)."
  cp "data/app.db" "$DB_SNAPSHOT"
else
  # Crash-consistent online backup.
  sqlite3 "data/app.db" ".backup '$DB_SNAPSHOT'"
fi

ZIP="backups/appraise-os-${STAMP}.zip"
echo "→ Packing $ZIP ..."
zip -rq "$ZIP" "$DB_SNAPSHOT" uploads/ 2>/dev/null || {
  tar czf "${ZIP%.zip}.tgz" "$DB_SNAPSHOT" uploads/
  ZIP="${ZIP%.zip}.tgz"
}

rm -f "$DB_SNAPSHOT"

# Keep the last 30 archives; discard older ones.
ls -1t backups/appraise-os-*.* 2>/dev/null | tail -n +31 | xargs -I{} rm -f "{}" || true

echo "✓ Backup saved: $ZIP"

#!/usr/bin/env bash
# Register AppraiseOS with macOS launchd so it starts automatically whenever
# you log in. Writes a per-user plist to ~/Library/LaunchAgents and loads it.
#
# Uninstall with:  launchctl unload ~/Library/LaunchAgents/com.appraiseos.plist
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  echo "❌ Node not found in PATH. Install Node 20 first."
  exit 1
fi
PLIST_PATH="$HOME/Library/LaunchAgents/com.appraiseos.plist"

mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
        "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.appraiseos</string>
    <key>ProgramArguments</key>
    <array>
        <string>${APP_DIR}/scripts/start.sh</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${APP_DIR}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$(dirname "$NODE_BIN"):/usr/local/bin:/usr/bin:/bin</string>
        <key>NODE_ENV</key>
        <string>production</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${APP_DIR}/data/appraiseos.log</string>
    <key>StandardErrorPath</key>
    <string>${APP_DIR}/data/appraiseos.log</string>
</dict>
</plist>
EOF

# Reload if it was already registered.
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

echo "✓ AppraiseOS is now registered to start at login."
echo "  Log file: ${APP_DIR}/data/appraiseos.log"
echo "  To disable: launchctl unload '$PLIST_PATH'"

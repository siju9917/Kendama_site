#!/usr/bin/env bash
# Production packaging for Chrome Web Store submission (Phase 8.1).
#
# Produces dist/ with the extension and biddiff-v<version>.zip ready for upload.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> running all gates"
bash scripts/ci.sh

VERSION=$(node -e "console.log(require('./package.json').version)")
ZIP="biddiff-v${VERSION}.zip"

echo "==> building"
npm run build

echo "==> packaging"
rm -f "$ZIP"
( cd dist && zip -qr "../$ZIP" . )

SIZE=$(du -h "$ZIP" | awk '{print $1}')
echo "==> wrote $ZIP ($SIZE)"
echo ""
echo "Next steps (manual):"
echo "  1. Open https://chrome.google.com/webstore/devconsole"
echo "  2. Upload $ZIP"
echo "  3. Paste store listing from docs/store-listing.md"
echo "  4. Paste permissions justifications from the same file"
echo "  5. Set privacy policy URL (publish docs/privacy-policy.md first)"
echo "  6. Submit for review"

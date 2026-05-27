#!/usr/bin/env bash
# Local CI gates. Run all four; exit non-zero on any failure.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> typecheck"
npm run typecheck

echo "==> lint"
npm run lint

echo "==> test"
npm test

echo "==> build"
npm run build

echo "==> ALL GATES PASSED"

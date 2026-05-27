#!/usr/bin/env bash
#
# run-kendama.sh — headless launch script.
#
# THIS IS THE CRON FALLBACK ONLY. The factory's primary trigger
# is a Claude Code Routine (see ops/SCHEDULE_SETUP.md). Use this
# script only if your plan does not include Routines.
#
# What it does: launches a Claude Code session against this
# repository with the same self-contained prompt the Routine
# uses, then exits when the session does.
#
# Pre-conditions:
#   - claude-code CLI is installed and authenticated on the host
#   - the host has internet access
#   - the repository is at the path this script is run from
#
# Logging:
#   The wrapper redirects stdout/stderr to ops/session-logs/
#   in the SCHEDULE_SETUP.md cron entry. Inside the session,
#   the factory writes the brain and the weekly digest itself.

set -euo pipefail

# Move to the repository root regardless of where cron invokes us.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Ensure a clean working tree at start (a leftover dirty state
# from an interrupted prior session is a META lesson, not a
# blocker). Stash anything dirty for safety; the factory will
# pick it up on inspection.
if ! git diff-index --quiet HEAD --; then
  STASH_NAME="run-kendama-autostash-$(date -u +%Y%m%dT%H%M%SZ)"
  git stash push -u -m "$STASH_NAME" || true
fi

# Pull latest main so the session starts from the current canonical
# state. Retry on transient network failure with exponential backoff
# (matches the Section 8.4 / loop.md push discipline).
ATTEMPTS=0
until git fetch origin && git checkout main && git pull origin main; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 4 ]; then
    echo "run-kendama: git fetch/pull failed after 4 attempts; continuing on local state" >&2
    break
  fi
  sleep $((2 ** ATTEMPTS))
done

# Launch the session. The prompt is intentionally identical to the
# Routine prompt in ops/SCHEDULE_SETUP.md so behavior is
# trigger-independent.
PROMPT='Read CLAUDE.md and run the operating loop until the spend cap in governance/SPEND_CAP.md, the platform session-duration limit, or the schedule window is reached. Do not stop earlier. Commit and push the brain at session end. Write human/WEEKLY_DIGEST.md as the last action of the session.'

if ! command -v claude >/dev/null 2>&1; then
  echo "run-kendama: claude CLI not found; install Claude Code and authenticate" >&2
  exit 2
fi

# --print runs non-interactively; --resume not used (each cron run
# is a fresh session by design — the brain carries state, not the
# CLI's session memory).
claude --print --add-dir "$REPO_ROOT" "$PROMPT"

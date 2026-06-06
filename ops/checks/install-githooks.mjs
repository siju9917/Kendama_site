#!/usr/bin/env node
// install-githooks.mjs — activate Kendama's committed git hooks (GUARDRAILS #17).
//
// Idempotent. Run as the FIRST action of every session (ops/loop.md session
// start, alongside run-all) so that every fresh Saturday clone of `main` wires
// the commit-msg auto-skip hook before the factory makes its first commit. The
// hook keeps the factory's constant pushes from triggering external host
// auto-deploy builds — the Render `appraise-os` build-failure email spam the
// human hit on 2026-06-06.
//
// Dependency-free: needs only a Node runtime + git (no npm install, no build),
// so it runs on a bare clone. Sets `core.hooksPath` to the committed hooks dir
// rather than copying into .git/hooks, so the hook tracks the repo and a future
// edit takes effect without re-copying.

import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url)); // ops/checks
const REPO_ROOT = resolve(here, '..', '..');
const HOOKS_DIR = 'ops/githooks';
const hookPath = join(REPO_ROOT, HOOKS_DIR, 'commit-msg');

if (!existsSync(hookPath)) {
  console.error(`install-githooks: ${HOOKS_DIR}/commit-msg is missing — cannot activate the auto-skip interlock (GUARDRAILS #17).`);
  process.exit(1);
}

// Make the hook executable (a fresh clone may not preserve the bit on all
// platforms; git core.hooksPath requires it).
try {
  chmodSync(hookPath, 0o755);
} catch (err) {
  console.error(`install-githooks: could not chmod ${HOOKS_DIR}/commit-msg: ${err.message}`);
  process.exit(1);
}

try {
  execFileSync('git', ['config', 'core.hooksPath', HOOKS_DIR], { cwd: REPO_ROOT });
} catch (err) {
  console.error(`install-githooks: could not set core.hooksPath: ${err.message}`);
  process.exit(1);
}

console.log(`install-githooks: core.hooksPath -> ${HOOKS_DIR}; commit-msg auto-skip active (every commit carries host deploy skip-tokens, GUARDRAILS #17).`);

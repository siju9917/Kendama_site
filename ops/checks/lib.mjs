// lib.mjs — shared helpers for Kendama factory-level checks.
//
// These checks are dependency-free Node ESM modules. They run with
// nothing but a Node runtime (no npm install, no build step) so the
// factory can run them at session start (see `ops/loop.md`) on a
// fresh clone before any product's toolchain is installed.
//
// GUARDRAIL NOTE (governance/GUARDRAILS.md #1-2): this infrastructure
// is explicitly NOT a CI surface. It is run by the Kendama session
// itself as part of the operating loop. It must never be wired into
// GitHub Actions or any other CI scheduler.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url)); // ops/checks
export const REPO_ROOT = resolve(here, '..', '..'); // repo root

/** Read a repo-relative text file. Throws if missing. */
export function readText(relPath) {
  return readFileSync(join(REPO_ROOT, relPath), 'utf8');
}

/** True if a repo-relative path exists. */
export function exists(relPath) {
  return existsSync(join(REPO_ROOT, relPath));
}

/** True if a repo-relative path exists and is a directory. */
export function isDir(relPath) {
  const abs = join(REPO_ROOT, relPath);
  return existsSync(abs) && statSync(abs).isDirectory();
}

/**
 * Recursively list repo-relative file paths under a directory.
 * Skips node_modules, dist, and .git. Returns [] if dir is absent.
 */
export function listFiles(relDir) {
  const abs = join(REPO_ROOT, relDir);
  if (!existsSync(abs)) return [];
  const out = [];
  const skip = new Set(['node_modules', 'dist', '.git', '.vite']);
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(relative(REPO_ROOT, full));
    }
  };
  walk(abs);
  return out;
}

/**
 * A finding has a level (P0 | P1 | P2 | info) and a message.
 * A check returns { name, findings: Finding[] }. Zero P0/P1 findings
 * means the check passed; the runner exits non-zero otherwise.
 */
export function finding(level, message) {
  return { level, message };
}

/** Levels that fail the run (block the gate). */
export const BLOCKING_LEVELS = new Set(['P0', 'P1']);

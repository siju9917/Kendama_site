# Migration Log — Kendama_site → Kendama

This file is the audit trail of the one-time migration that transformed
the existing `Kendama_site` repository (which held in-progress BidDiff
work built over earlier retired code) into the Kendama autonomous
product factory.

The repository name `Kendama_site` and its GitHub URL are unchanged
per the naming convention in PART 0.5 of the founding spec.

---

## Migration timestamp

- **Date:** 2026-05-27
- **Migration tag (local):** `pre-kendama-migration-20260527`
- **Backup branch (pushed):** `pre-kendama-backup`
- **Working branch:** `claude/biddiff-extension-ijZiE`

## Pre-migration HEAD

- **Commit:** `dfe5cbf`
- **Message:** `Disclaimer: drop the "Always confirm" directive; LicenseChip: capitalize tier`
- **Branch:** `claude/biddiff-extension-ijZiE`

## What the repository contained at migration time

A working in-progress BidDiff Chrome MV3 extension. No retired
pre-BidDiff code was found in the working tree (see Step 2 below).

---

## Step 1 — Safety backup

Per PART 12.2.

1. Working tree was clean (no uncommitted work).
2. Backup branch `pre-kendama-backup` created from HEAD `dfe5cbf` and
   pushed to `origin/pre-kendama-backup`. Verified.
3. Annotated tag `pre-kendama-migration-20260527` created locally
   at the same commit.
4. **Tag push failed (HTTP 403 from the remote).** The remote in
   this environment does not accept tag pushes from this access
   scope. The branch `pre-kendama-backup` provides the same recovery
   capability — anyone can `git checkout pre-kendama-backup` to
   restore the pre-migration tree — so the safety property is
   satisfied. The tag remains locally and can be pushed later from
   an environment with tag-push permission. Recorded as a known
   limitation, not a blocker.

## Step 2 — Inventory

Per PART 12.3.

**Top-level files and directories at migration time:**

- BidDiff product source: `src/`, `test/`, `docs/`, `server/`, `scripts/`, `icons/`, `dist/`, `dist-zips/`.
- BidDiff build config: `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `manifest.config.ts`, `eslint.config.js`.
- BidDiff working notes at root: `ARCHITECTURE.md`, `BLOCKERS.md`, `BUILD_COMPLETE.md`, `CHANGELOG.md`, `DECISIONS.md`, `FINAL_VERIFICATION.md`, `PREFLIGHT.md`, `PROGRESS.md`, `PUSH_LOG.md`, `REFLECTION_LOG.md`, `RESUME.md`, `SELF_AUDIT.md`, `STATE.md`, `TESTING.md`.
- `README.md` (rewritten in Step 6).
- `node_modules/` (generated; ignored).

**Branch survey:**

- `claude/biddiff-extension-ijZiE` — the BidDiff working branch (current).
- `main` — base branch (untouched by migration).
- `pre-kendama-backup` — the safety branch just created.

**Old pre-BidDiff code disposition (KEY FINDING):**

The human's instruction in PART 12 anticipated that some earlier
"retired" code might still exist in the working tree from before
BidDiff. A direct survey of the current tree, plus a scan of the
commit graph and `git log --all --diff-filter=D`, found **no
pre-BidDiff retired code in the working tree**: every file present
belongs to the BidDiff product or to BidDiff's own working notes.

History does contain an earlier Next.js real-estate appraisal
application (`app/(app)/jobs/*`, `comps`, `inspection`, `invoice`,
`workfile/*` — and an old `.github/workflows/ci.yml`) that was
deleted from the working tree before the BidDiff work began. That
code is preserved indefinitely in git history (it remains
reachable from the commit graph) and is also reachable by checking
out `pre-kendama-backup` and walking history. No further action
required — it is already retired exactly as PART 12.4 prescribes
for code that exists only in history.

No `.github/workflows/` directory exists. No GitHub Actions or
CI scheduler is present. This satisfies the Section 8.1 / 8.3
prohibition.

## Step 3 — Disposition decisions

Per PART 12.4.

- **BidDiff source, tests, docs, build config:** KEEP. Relocated
  into `products/biddiff/` via `git mv` (Step 5) so history is
  preserved per file.
- **BidDiff working notes at root** (`PROGRESS.md`, `STATE.md`,
  `REFLECTION_LOG.md`, `DECISIONS.md`, etc.): MOVE INTO PRODUCT.
  These were BidDiff-specific. They become `products/biddiff/`
  per-product files (`PROGRESS.md`, `REFLECTION_LOG.md`) or are
  consolidated into the new Kendama `brain/` and `products/biddiff/`
  surfaces. The root reserves filenames like `STATE.md`,
  `DECISIONS.md`, `PROGRESS.md` for Kendama brain use.
- **`pre-kendama-backup` branch:** RETAINED. It is the safety
  recovery point. Never delete.
- **`dist/`, `dist-zips/`, `node_modules/`:** generated artifacts —
  removed from the new structure on regeneration. Kept in
  `.gitignore` (added in Step 5 if missing).

No disposition required action against history; nothing is being
destroyed irreversibly.

## Step 4 — Erect Kendama structure (= PART 10 bootstrap)

Logged separately in the commit that creates the structure. See
`brain/DECISIONS.md` for substantive choices made during bootstrap.

## Step 5 — Relocate BidDiff

Logged separately in the commit that performs the `git mv`s. Build
verification (typecheck + tests passing from the new location) is
required before the commit is finalized.

## Step 6 — Clean the root and finalize

Logged separately in the commit that completes the migration.

## Step 7 — Resume as Kendama

The migration ends with the working tree in Kendama shape: Kendama
brain, governance, human-interface, and ops files at the root;
BidDiff alive in `products/biddiff/` and building green; this log
complete.

---

## Migration complete — 2026-05-27

The Kendama structure is in place, BidDiff is relocated with full
file history preserved by `git mv`, the working tree at root holds
only Kendama files plus `products/biddiff/`, the safety branch
`pre-kendama-backup` is pushed and reachable, and tests / lint /
typecheck pass from the new BidDiff location (226/226).

**Final structure summary:**

```
CLAUDE.md  MIGRATION_LOG.md  README.md  .gitignore
brain/   governance/   human/   ops/   play/   products/biddiff/
```

**Recovery remains available indefinitely** via
`git checkout pre-kendama-backup` (the safety branch) or, in any
environment where tag-push is permitted, via the local tag
`pre-kendama-migration-20260527` (which can be re-pushed when
that environment becomes available).

The factory now resumes as Kendama. The next session's P0 task is
the first formal Kendama critique panel pass on BidDiff (see
`products/biddiff/PROGRESS.md` and `brain/STATE.md`).

---

## Recovery

If anything goes wrong at any point:

```
git fetch origin
git checkout pre-kendama-backup
```

…restores the entire pre-migration working tree. The dated tag
`pre-kendama-migration-20260527` resolves to the same commit
locally (and can be re-pushed once tag-push permission is
available on the remote).

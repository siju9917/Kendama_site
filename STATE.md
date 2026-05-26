# External Memory (Part 17.1)

Updated before and after every half-step.

## Current phase / half-step

- Phase 0 closing — scaffold + data model done. Moving to Phase 1.

## Mental model of what is built

- Canonical document model lives in `src/core/model/types.ts`.
- Diff output model lives in `src/core/diff/types.ts`.
- Interfaces (extractor, diff engine, clause client, SAM integration, storage, license)
  live in `src/core/interfaces.ts`. Everything downstream of extraction goes
  through these interfaces.
- Pure helpers live in `src/shared/`: `hash.ts` (FNV-1a content addressing),
  `text.ts` (deterministic normalize + tokenize + jaccard + levenshtein),
  `constants.ts` (tuned thresholds).
- `src/core/model/build.ts` exports `buildBlock` / `buildSection` / `buildDocument`
  that compute stable content-hash IDs.
- Vite/Vitest/ESLint(flat)/TSC all wired and green.
- MV3 manifest defined with minimal permissions: storage, sidePanel, offscreen,
  hosts limited to sam.gov.
- CI defined in `.github/workflows/ci.yml`.

## Last 5 decisions (most recent first)

1. ESLint 9 flat config (spec said `.eslintrc`; eslint v9 refused).
2. Tokenizer connectors `._-/` are interior-only (preserves "52.204-21" while
   diffing trailing dots cleanly).
3. FNV-1a 32-bit twice → 16-char hex content hash.
4. CRXJS Vite plugin (2.0.0-beta) chosen for MV3 + Vite + React.
5. Tracking docs all created at repo root per Part 0.4 + Part 17.10.

## Next 3 actions

1. Commit Phase 0 work and push to `claude/biddiff-extension-ijZiE`.
2. Begin Phase 1 with a pre-flight: try to reach SAM.gov Opportunities API.
3. Build labeling schema + corpus harness regardless of corpus source.

## Open questions

- None blocking. Real-corpus vs. synthetic-corpus decision deferred until 1.1.

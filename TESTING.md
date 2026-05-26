# Testing Standard

## Tiers

1. **Unit** (`src/**/*.test.ts`, `test/unit/`) — pure functions, isolated modules.
2. **Integration** (`test/integration/`) — multi-module flows (extract → diff,
   storage round-trips, etc.).
3. **Corpus regression** (`test/integration/corpus.test.ts`) — every labeled
   amendment pair is an automated test. Frozen at the Phase 3.13 gate.
4. **End-to-end** (`test/e2e/`, Playwright) — install extension into a real
   Chromium, drive the three core journeys.

## Required gates (Part 14)

- Zero missed CRITICAL changes across the labeled corpus.
- Overall recall ≥98% vs. hand-labeled ground truth.
- Zero false positives on reformatting-only pairs.
- Deterministic diff output.
- Every malformed/edge-case input yields a clear typed error.
- No memory growth across a 50-diff soak test.
- License check tamper-resistant; offline degrades gracefully.
- `npm run build && npm run lint && npm test` passes with zero errors.

## Phase 0 results (current)

- `npm test`: **24/24 passing** (text, hash, model/build).
- `npm run typecheck`: clean.
- `npm run lint`: clean (zero warnings, max-warnings=0).
- Build not yet runnable (no entry HTMLs); next at Phase 4.

## Accuracy-claim audit (Phase 6.10)

Every accuracy number in the store listing or docs must trace to a measured
corpus result. Tracked here once measurements exist.

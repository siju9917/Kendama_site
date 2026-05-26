# Testing Standard

## Tiers

1. **Unit** (`src/**/*.test.ts`, `test/unit/`) — pure functions, isolated modules.
2. **Integration** (`test/integration/`) — multi-module flows (extract → diff,
   storage round-trips, etc.).
3. **Corpus regression** (`test/integration/corpus.test.ts`) — every labeled
   amendment pair is an automated test. Frozen at the Phase 3.13 gate.
4. **End-to-end (recommended addition)** — install extension into a real
   Chromium via Playwright and drive the three core journeys. Not part
   of this codebase yet; add `@playwright/test` when wiring up a CI
   environment that has a Chromium binary available.

## Required gates (Part 14)

- Zero missed CRITICAL changes across the labeled corpus.
- Overall recall ≥98% vs. hand-labeled ground truth.
- Zero false positives on reformatting-only pairs.
- Deterministic diff output.
- Every malformed/edge-case input yields a clear typed error.
- No memory growth across a 50-diff soak test.
- License check tamper-resistant; offline degrades gracefully.
- `npm run build && npm run lint && npm test` passes with zero errors.

## Phase 0 results

- `npm test`: 24/24 passing (text, hash, model/build).
- `npm run typecheck`: clean.
- `npm run lint`: clean (zero warnings, max-warnings=0).

## Phase 1 results

- 40 amendment pairs / 80 documents, hand-labeled by generator.
- 33 unit tests passing.
- Corpus harness validates against any `IDiffEngine`.

## Phase 2 results

- 100 unit tests passing.
- PDF extraction end-to-end in Node (PDF.js legacy + fake worker).
- DOCX extraction end-to-end in Node (JSZip + custom XML walker).

## Phase 3 results — THE MOAT

Initial corpus miss-rate audit at 40 pairs.

## Phase 6 expanded audit (75 pairs / 150 docs)

```
Pairs:              75
Expected changes:   120
Actual changes:     120
Hits:               120
Missed (total):     0
Critical expected:  108
Critical missed:    0   <-- HARD FLOOR: must be 0
False positives:    0
FP on null pairs:   0   <-- HARD FLOOR: must be 0
Recall:             100.00%   <-- must be ≥98%
Precision:          100.00%
```

- 168/168 unit + integration tests passing.
- Determinism: byte-identical repeat runs across every corpus pair.
- End-to-end PDF round-trip (render via pdf-lib → extract via PDF.js → diff):
  5 representative pairs, zero missed criticals.
- Reformatting-noise pairs (ligatures, curly quotes, broken clause numbers
  across whitespace, extra whitespace): zero changes emitted.
- Real-world prose anchor recall: ISO/US/Month-Day-Year/Day-Month-Year/
  legal-style dates; FAR/DFARS/GSAR/NFS clause prefixes; PDF-broken clause
  numbers; 5 common page-limit phrasings.
- Typecheck clean. Lint clean. Build clean.

## Accuracy claims (traceable to measurements)

| Claim                                                          | Measurement |
| -------------------------------------------------------------- | ----------- |
| "Zero missed critical-category changes" (store listing, docs)  | 75-pair corpus + 5 e2e-PDF + 5 noise-buried — all zero missed CRITICAL |
| "100% recall on the labeled corpus"                            | corpus miss-rate audit |
| "Deterministic"                                                 | 75 pairs × 2 runs each, byte-identical |
| "Survives reformatting"                                         | reformatting-noise test (3 samples, zero changes) + noise-plus-change test (5 samples) |

## Accessibility

- All 6 design-system color contrasts pass WCAG AA.
- File-picker dropzones have ARIA labels and explicit label/input pairs.
- Loading state has aria-live="polite".

## Compliance

- No-advisory-language test passes against the disclaimer, export prose,
  and every clause's plainLanguageNote.

## Accuracy-claim audit (Phase 6.10)

Every accuracy number in the store listing or docs must trace to a measured
corpus result. Tracked here once measurements exist.

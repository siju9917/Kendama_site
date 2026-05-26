# BidDiff Architecture

## High-level

BidDiff is a Manifest V3 Chrome extension. Document content never leaves the
user's device except on an explicit per-document opt-in (server OCR).

```
┌────────────────────┐    ┌─────────────────────┐    ┌──────────────────┐
│  Content script    │    │  Service worker     │    │  Offscreen doc   │
│  (sam.gov only)    │◀──▶│  (orchestration)    │◀──▶│  (heavy work:    │
│                    │    │                     │    │   extract+diff)  │
└────────────────────┘    └─────────────────────┘    └──────────────────┘
            │                       │                          │
            ▼                       ▼                          ▼
       ┌──────────────────────────────────────────────────────────┐
       │           Side panel (React) — main workspace            │
       └──────────────────────────────────────────────────────────┘
                            │                       │
                            ▼                       ▼
                    ┌───────────────┐     ┌───────────────────┐
                    │  Local /      │     │ Backend (server/) │
                    │  IndexedDB    │     │  - license check  │
                    │  storage      │     │  - clause API     │
                    │               │     │  - opt-in OCR     │
                    └───────────────┘     │  - telemetry      │
                                          └───────────────────┘
```

## Modules

### `src/core/model/`
Canonical document model (`types.ts`) and pure constructors (`build.ts`).
**Everything else depends on this.** Content-addressable IDs make output deterministic.

### `src/core/extract/`
PDF.js + DOCX + OCR -> `StructuredDocument`. Implements `IExtractor`.
- `pdf/` — PDF.js extraction (positioned text items, line/block reconstruction,
  two-column reading order).
- `docx/` — DOCX structural extraction.
- `ocr/` — Tesseract WASM fallback (Phase 2.10).
- `anchors/` — Anchor detectors (clause, date, money, page-limit, CLIN, section-ref).
- `sections/` — Heading detection, UCF mapping, section-type classification.
- `normalize.ts` — composes the pipeline.

### `src/core/diff/`
The moat. Pure deterministic function `(current, prior) -> DiffResult`.
- `align/sections.ts` — UCF-aware section alignment.
- `align/blocks.ts` — Myers/LCS block alignment with similarity threshold for MODIFY.
- `align/moves.ts` — Cross-document move detection.
- `tokens.ts` — Token-level diff (Myers).
- `classify.ts` — Maps Change -> ChangeCategory.
- `critical.ts` — Applies the Part 1.5 critical-change ruleset.
- `suppress.ts` — Drops reformatting-only / pagination-only changes.
- `index.ts` — Composes everything into `IDiffEngine`.

### `src/core/clauses/`
FAR/DFARS clause data + lookup. Bundled clause dataset in `data/` so offline
lookup works; the server endpoint augments and updates this.

### `src/core/export/`
PDF report builder + clipboard summary. Output includes the neutral disclaimer.

### `src/core/storage/`
`chrome.storage` + IndexedDB. Implements `IStorage` with size cap + LRU prune.

### `src/core/licensing/`
License client. **Forbidden** from importing any model type (Part 3.4).
An automated test enforces this.

### `src/content/sam/`
**The only place SAM.gov-specific selectors live.** Implements `ISamIntegration`.
An automated grep test fails if SAM.gov selectors leak elsewhere.

### `src/background/`
Service worker. Orchestrates content <-> offscreen <-> sidepanel; persists job state.

### `src/offscreen/`
Hosts extraction and diff (heavy CPU/canvas) so they don't block the side panel.

### `src/sidepanel/`, `src/popup/`, `src/options/`
React UIs. Side panel is the main workspace; popup shows account/recent; options
holds settings & license key.

### `server/`
Serverless functions: license validation, clause API, opt-in OCR, telemetry.
Scales to zero.

### `test/corpus/`
Solicitation corpus + hand-labeled ground truth. The miss-rate audit measures
the diff engine against this.

## Data flow & the privacy rule

- ArrayBuffers, `StructuredDocument`, `DiffResult` may exist ONLY in:
  the offscreen document, the side panel, and extension local storage.
- They may NEVER appear as parameters to anything in `src/core/licensing/` or
  any telemetry call.
- A static check (test) greps those modules for forbidden imports.

## Determinism rule

- `src/core/diff/` is forbidden `Date.now()`, `Math.random()`, and iteration
  over unordered structures. IDs are content hashes. A determinism test runs
  the same pair twice and asserts equality minus the top-level `generatedAt`.

## SAM.gov drill

A simulated SAM.gov DOM change must be fixable by editing only `src/content/sam/`.
The integration-isolation grep test enforces this; the Phase 6.4 drill verifies it.

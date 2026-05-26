# BidDiff Architecture

## High-level

BidDiff is a Manifest V3 Chrome extension. Document content never leaves the
user's device except on an explicit per-document opt-in (server OCR).

```
┌────────────────────┐    ┌─────────────────────┐    ┌──────────────────┐
│  Content script    │    │  Service worker     │    │  Offscreen doc   │
│  (sam.gov only)    │◀──▶│  (orchestration +   │◀──▶│  (heavy work:    │
│  - SAM selectors   │    │   attachment cache) │    │   extract+diff)  │
│  - typed messages  │    │  - opens side panel │    │                  │
└────────────────────┘    └─────────────────────┘    └──────────────────┘
            │                       │                          │
            └───────────────────────┴──────────────────────────┘
                                    │ BidDiffMessage (typed)
                                    ▼
                      ┌──────────────────────────────────┐
                      │  Side panel (React)              │
                      │   - ErrorBoundary at the root    │
                      │   - useDiffPipeline state machine│
                      │   - DiffView (filters + keyboard)│
                      │   - prewarms PDF.js on mount     │
                      └──────────────────────────────────┘
                            │                       │
                            ▼                       ▼
                    ┌───────────────────┐  ┌───────────────────┐
                    │  chrome.storage   │  │ Backend (server/) │
                    │  + IndexedDB      │  │  - license HMAC   │
                    │  - atomic save    │  │  - clause API     │
                    │  - schema version │  │  - opt-in OCR     │
                    │  - markViewed     │  │  - telemetry      │
                    └───────────────────┘  └───────────────────┘
```

## Runtime flow (the current diff path)

1. User picks two files in the side panel (or clicks an attachment from
   SAM.gov via the content-script hand-off).
2. Side panel dispatches `runDiffPipeline(current, prior, onProgress, signal)`.
3. If `chrome.offscreen` is available, `ensureOffscreenDocument()` creates
   `src/offscreen/index.html` (idempotent). The panel sends a `DiffJobMsg`
   with both `ArrayBuffer`s and a `jobId`.
4. The offscreen document validates inputs, picks an extractor (PDF.js
   or DOCX), produces both `StructuredDocument`s, runs the diff engine,
   and posts `DiffProgressMsg`(s) followed by either a `DiffResultMsg`
   or `DiffErrorMsg`.
5. The side panel filters incoming messages by `jobId` and updates the
   state machine. If the user clicks "Start over" mid-job, the
   `AbortController` cancels — the offscreen run continues but its
   subsequent messages are dropped.
6. On `DiffResultMsg`, the panel persists the diff via `DiffStorage`
   (atomic write-then-index, payload to IndexedDB above 4 MB) and
   renders the `DiffView`.

## Modules

### `src/core/model/`
Canonical document model. Content-addressable IDs make output deterministic.

### `src/core/extract/`
- `pdf/` — PDF.js extraction (positioned text items, line/block
  reconstruction, two-column reading order, cross-page reassembly,
  repeating header/footer stripping).
- `docx/` — JSZip + custom XML walker; one paragraph per `<w:tbl>` row.
- `anchors/` — Clause / date / money / page-limit / CLIN / section-ref
  detectors, normalized to canonical form.
- `sections/` — Heading detection, UCF mapping, section-type classifier.
- `normalize.ts` — composes the pipeline (anchor enrichment).
- `validate.ts` — magic-byte detection + typed `ExtractionError`.

### `src/core/diff/`
The moat. Pure deterministic function `(current, prior) → DiffResult`.
- `myers.ts` — LCS with a custom equality predicate; `Int32Array` dp.
- `align/sections.ts` — UCF-aware section alignment (greedy best-first).
- `align/blocks.ts` — Identical-sequence fast-path + LCS + MODIFY pairing
  via `max(jaccard, containment)`.
- `align/moves.ts` — Cross-document MOVE detection at similarity ≥0.9.
- `tokens.ts` — Token-level diff for MODIFY; punctuation joins directly.
- `classify.ts` — Anchor + section-type → `ChangeCategory` (first match).
- `critical.ts` — Part 1.5 ruleset → severity + reasons.
- `suppress.ts` — Drops reformatting-only diffs.
- `engine.ts` — Composes everything; deterministic.

### `src/core/clauses/`
62 curated FAR/DFARS clauses + neutral plain-language notes. Bundled in
the extension so lookup works offline; server endpoint augments.

### `src/core/export/`
PDF report (pdf-lib): branded header, summary card, per-category
breakdown, contents page for ≥10 changes, critical-changes section with
red accent bars, neutral disclaimer footer. Plus plain-text and
CommonMark-safe Markdown clipboard exports.

### `src/core/storage/`
- chrome.storage for the index + small payloads.
- IndexedDB for payloads >4 MB (via `idb.ts`).
- Atomic `saveDiff` with rollback on index-write failure.
- Schema versioning (`INDEX_SCHEMA_VERSION`).
- `markViewed` + `deleteDiff` + corruption recovery.

### `src/core/licensing/`
Local trial logic (14-day + 7-day grace). **Forbidden** from importing
any document-model / diff / extract type — enforced by the integration-
isolation test.

### `src/core/telemetry/`
TelemetryClient with settings-aware opt-out, persistent session UUID,
keepalive POST. **Forbidden** from importing any document-model type.

### `src/content/sam/`
Concrete `IOpportunitySite` implementation for SAM.gov. **THE ONLY PLACE**
where SAM.gov DOM selectors and URL patterns live.

### `src/background/`
Service worker. Opens the side panel; caches the most recently discovered
attachments from the SAM content script.

### `src/offscreen/`
Hosts extract + diff so the side panel stays responsive. Loads PDF.js
once and caches it.

### `src/sidepanel/`
React workspace, split across small components:
`App`, `DiffView`, `Summary`, `ChangeCard`, `FilePicker`,
`FilePickerWithSam`, `SamAttachments`, `History`, `Onboarding`,
`ReviewPrompt`, `LicenseChip`, `ProgressView`, `ErrorBoundary`,
`useDiffPipeline`. Dark mode via `prefers-color-scheme`.

### `src/shared/`
- `messages.ts` — Typed `BidDiffMessage` union shared across IPC.
- `chrome-rt.ts` — Safe wrappers that swallow `chrome.runtime.lastError`.
- `text.ts` — Normalization (ligatures, curly quotes, soft hyphens,
  hyphen-broken line wraps, broken clause numbers across whitespace) +
  tokenizer + jaccard/containment/levenshtein similarity.
- `hash.ts` — FNV-1a content addressing.
- `constants.ts` — Tuned thresholds.
- `disclaimer.ts` — Single canonical disclaimer string used everywhere.

### `server/`
Platform-agnostic serverless handlers: health, clauses lookup, license
validation with HMAC-SHA256, anonymous telemetry (structurally
content-free), opt-in OCR stub.

### `test/`
- `corpus/` — 75-pair synthetic corpus + harness + generator.
- `integration/` — corpus audit, e2e PDF round-trip, reformatting noise,
  hand-crafted adversarial, anchor recall, perf, memory soak.
- `unit/` — integration-isolation, accessibility (contrast), compliance
  (no-advisory-language).

## Architectural rules (each enforced by an automated test)

- **SAM.gov isolation.** Only files under `src/content/sam/` may
  reference SAM.gov URL patterns or `data-sam-*` selectors. Enforced by
  `test/unit/integration-isolation.test.ts`.
- **Privacy boundary.** `src/core/licensing/` and `src/core/telemetry/`
  cannot import any document/diff/extract types. Enforced by the same
  test.
- **Determinism.** The diff engine produces byte-identical output for
  byte-identical input. Verified by the corpus determinism test.
- **No advisory language.** Every clause `plainLanguageNote`, the
  disclaimer, and the export prose pass a grep for advisory phrasing.
  Enforced by `test/unit/no-advisory-language.test.ts`.
- **WCAG AA contrast.** Every design-system color pair passes 4.5:1
  (or 3:1 for AA-large). Enforced by
  `test/unit/accessibility.test.ts`.
- **No false positives on reformatting.** Verified by
  `test/integration/reformatting-noise.test.ts`.
- **No missed critical changes.** Verified by
  `test/integration/corpus.test.ts` (the corpus miss-rate audit).

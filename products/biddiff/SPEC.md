# BidDiff — Product Spec

**One-line:** Chrome MV3 extension that diffs amended U.S. federal
solicitations against prior versions for proposal / capture teams.

**Status:** `build` — see `STATUS.md`.

**Slug:** `biddiff`

---

## What it does

A user drops two PDF or DOCX files into the side panel (the new
amendment and the prior version). BidDiff extracts text from each
on-device, normalizes for OCR and ligature noise, runs a
deterministic LCS diff producing categorized changes (Dates &
Deadlines, Clauses, Pricing/CLINs, Submission Instructions,
Evaluation Criteria, Attachments, Scope/SOW, Other), tags critical
changes per a documented critical-changes rule, and presents:

- a filterable, searchable change list with keyboard navigation;
- a Summary with totals, critical count, and extraction
  confidence;
- exports: branded PDF, plain text, Markdown summary;
- history of past diffs (LRU, persisted to chrome.storage +
  IndexedDB); and
- a SAM.gov content-script integration that surfaces
  amendment attachments on the SAM.gov page itself.

The product operates entirely on-device. No document content
leaves the browser.

## What it does NOT do

- It does not advise. BidDiff **reports** what changed; it does
  not say what to do about it. Advisory language is forbidden in
  every BidDiff-authored prose surface, enforced by a passing
  automated test (`test/unit/no-advisory-language.test.ts`).
- It does not OCR scanned PDFs server-side without explicit
  consent (server OCR is gated; the v1 default is on-device
  only).
- It does not negotiate, propose, or evaluate offers.

## Architecture

MV3 extension with the standard component split:

- **Side panel** — the main UI (React 18). Lives in `src/sidepanel/`.
- **Popup** — quick-open + recent diffs. `src/popup/`.
- **Options page** — settings (license key, telemetry opt-out,
  clear history). `src/options/`.
- **Offscreen document** — hosts the heavy PDF/DOCX work and the
  diff engine off the UI thread. `src/offscreen/`.
- **Background service worker** — message relay and the
  SAM.gov attachments cache (in `chrome.storage.session`).
  `src/background/`.
- **Content script** — runs on `sam.gov` pages; collects
  attachment metadata for the side panel. `src/content/sam/`.

Pure core (no DOM, no chrome) lives in `src/core/`:

- `extract/` — PDF (pdf.js legacy build) and DOCX (JSZip)
  extractors.
- `diff/` — deterministic engine (alignment, classification,
  criticality, move detection, suppression).
- `clauses/` — local FAR/DFARS dataset and lookup.
- `export/` — PDF (pdf-lib), Markdown, and text exporters.
- `storage/` — `chrome.storage.local` + IndexedDB with a single
  serialized mutation queue.
- `licensing/` and `telemetry/` — privacy-isolated; an integration
  test enforces these modules cannot import any model/diff/extract
  type.

The current, canonical developer reference — including the
**"Extending BidDiff"** guide (how to add a critical rule, a section
type, an input format, or an export format) — is
`docs/architecture.md`. (`legacy-notes/ARCHITECTURE.md` is retained
only as pre-migration history.)

## Quality bar (product-specific overlays on `governance/QUALITY_BAR.md`)

- **Deterministic engine.** Same inputs produce byte-identical
  output. Enforced by `test/integration/corpus.test.ts`.
- **"Reports, never advises."** Enforced by
  `test/unit/no-advisory-language.test.ts` across the disclaimer,
  every UI string, every export, the clause notes, and the engine
  warnings.
- **Recall ≥ 98% on the labeled corpus** with zero false positives
  on null pairs. Enforced by the corpus audit test.
- **226+ tests passing** at the migration checkpoint; the count
  only grows.
- **Lint, format, typecheck clean with zero warnings.**

## Distribution

The Chrome Web Store. Self-serve install. Buyer audience: federal
proposal / capture teams; secondary audience: any organization
that has to read amended government solicitations.

## Monetization

Local trial → paid license. License client is
`src/core/licensing/client.ts` and is privacy-isolated from
document content.

## Build / test

From `products/biddiff/`:

```
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

## History

The full development history is in git, plus consolidated working
notes from before the Kendama migration in `legacy-notes/`:
`ARCHITECTURE.md` (the architecture overview), `PROGRESS.md` (the
phase-by-phase build record), `REFLECTION_LOG.md` (the iteration
record), `DECISIONS.md` (BidDiff-specific decisions),
`SELF_AUDIT.md` (the pre-migration audit). These are reference
material; the canonical Kendama files for this product are at
`products/biddiff/`.

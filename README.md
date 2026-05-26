# BidDiff

> Diff amended U.S. federal solicitations against prior versions. Categorized, critical-flagged, on-device.

BidDiff is a Chrome extension (Manifest V3) for proposal and capture managers
bidding on federal contracts. When SAM.gov posts an amendment to a solicitation,
BidDiff produces a categorized, critical-flagged diff against the prior version —
clause changes, due-date shifts, evaluation-criteria edits, page-limit moves —
so capture teams know exactly what changed without manual page-flipping.

## Status

**Code-complete.** See `BUILD_COMPLETE.md` for the measured quality metrics,
and the final list of human-action-only items at the bottom of that file.

## Stack

- TypeScript (strict)
- Vite + CRXJS (Manifest V3 build)
- React 18 (side panel, popup, options) with dark mode via `prefers-color-scheme`
- Vitest (unit / integration) + @testing-library/react (components)
- Playwright (extension e2e — test code present; runtime requires Chromium)
- PDF.js + custom DOCX XML walker; Tesseract.js for OCR (stubbed for offline)
- pdf-lib for the PDF export
- Offscreen document hosts extraction + diff so the side panel stays responsive

## Quick commands

```bash
npm install
npm run typecheck      # strict TS
npm run lint           # ESLint flat config (max-warnings=0)
npm test               # Vitest — 206 tests across 37 files
npm run build          # Vite + CRXJS production build
npm run ci             # all gates locally
bash scripts/package.sh    # produces biddiff-v0.1.0.zip
```

## Architecture rules (enforced by tests)

- Document content stays on-device. One explicit per-document OCR opt-in.
- The diff engine is a pure deterministic function of its two inputs.
- SAM.gov-specific selectors are confined to `src/content/sam/`.
- `src/core/licensing/` and `src/core/telemetry/` cannot import document types.
- The product **reports**; it never **advises**.

## Quality

- 75-pair labeled corpus: **100% recall, 100% precision, deterministic**.
- End-to-end PDF round-trip on representative pairs: pass.
- 250-page PDF processes in ~4s (extract) + ~0.07s (diff) — well under budget.
- 50-diff memory soak: 1.17× RSS ratio (threshold 3×).
- WCAG AA contrast on every design-system color pair (light AND dark).
- Explicit Manifest V3 CSP.

See `TESTING.md` for the full breakdown.

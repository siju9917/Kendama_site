# BidDiff

> Diff amended U.S. federal solicitations against prior versions. Categorized, critical-flagged, on-device.

BidDiff is a Chrome extension (Manifest V3) for proposal and capture managers
bidding on federal contracts. When SAM.gov posts an amendment to a solicitation,
BidDiff produces a categorized, critical-flagged diff against the prior version —
clause changes, due-date shifts, evaluation-criteria edits, page-limit moves —
so capture teams know exactly what changed without manual page-flipping.

## Status

In active build. See `PROGRESS.md` for the live checklist.

## Stack

- TypeScript (strict)
- Vite + CRXJS (Manifest V3 build)
- React 18 (side panel, popup, options)
- Vitest (unit / integration)
- Playwright (extension e2e)
- PDF.js (PDF extraction), Tesseract.js (on-device OCR)

## Quick commands

```bash
npm install
npm run typecheck   # strict TS
npm run lint        # ESLint flat config
npm test            # Vitest
npm run build       # production build (Phase 4+)
```

## Architecture

See `ARCHITECTURE.md`. Key rules:

- Document content stays on-device (one explicit opt-in OCR exception).
- The diff engine is a pure deterministic function of its two inputs.
- SAM.gov-specific code is isolated to `src/content/sam/`.
- The product **reports**, it never **advises**.

## Quality gates

See `TESTING.md`. Headline: zero missed critical-category changes; overall
recall ≥98% against the labeled corpus.

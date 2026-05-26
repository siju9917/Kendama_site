# BUILD_COMPLETE — BidDiff

Summary of the build at the point of code-completion.

## What was built

A Chrome Manifest V3 extension that diffs amended U.S. federal solicitations
against prior versions, plus a serverless backend, a marketing site, a help
center, store-submission assets, and full documentation. Built end-to-end
across the eight phases of the spec.

### Phase-by-phase

- **Phase 0 — Scaffold + data model.** TypeScript strict, Vite + CRXJS,
  React 18, Vitest, ESLint flat config, Prettier. Canonical document
  model (`Anchor`, `Block`, `Section`, `StructuredDocument`, UCF letter
  map). Diff output model (`Change`, `DiffResult`, `TokenSpan`,
  `ClauseInfo`). All module interfaces. Pure constructors with
  content-hash IDs.

- **Phase 1 — Test corpus.** Synthetic-from-generator approach (real
  SAM.gov was blocked by network policy). 75 amendment pairs / 150
  documents across 5 base templates (IT Services, Navy Supplies, NASA
  Research, Air Force Construction, DHS 8(a)). Every UCF section A–M
  in every doc. Generator emits ground-truth labels mechanically, so
  labeling error is structurally zero. Harness with per-pair and
  aggregate metrics.

- **Phase 2 — Extraction pipeline.** PDF.js-based PDF extractor with
  positioned text items, two-column-layout detection (x-coordinate
  histogram), line clustering, heading classifier (UCF, letter-dot,
  numbered, Section L/M item, font heuristic), section assembly with
  UCF letter detection and SectionType inference, anchor detectors
  (clause, date with 5 phrasings, money, page-limit, CLIN, section-ref),
  normalization composition, malformed-input handling with typed
  `ExtractionError`. DOCX extractor via JSZip + custom XML walker
  with `<w:tbl>` row handling for CLIN-style tables.

- **Phase 3 — Diff engine (THE MOAT).** Pure deterministic function of
  two `StructuredDocument`s. LCS section alignment by UCF + heading
  similarity; LCS block alignment with `max(jaccard, containment)`
  threshold for MODIFY (catches the expanded-item amendment pattern
  pure jaccard misses); cross-document MOVE detection at similarity
  ≥0.9; token-level Myers for word-precise MODIFY rendering with
  punctuation handled separately; classification with first-match
  precedence (anchor + section type); criticality per the spec Part
  1.5 ruleset with human-readable reasons; reformatting-only
  suppression. **Audit on the labeled corpus: 100% recall, 100%
  precision, zero missed CRITICAL, zero false positives on null
  pairs, deterministic across all 75 pairs.**

- **Phase 4 — Extension shell.** Manifest V3 with minimum permissions
  (storage, sidePanel, offscreen, sam.gov host). React side panel
  with file picker, summary card, categorized change cards, all/
  critical filter, four UI states (empty/loading/done/error), license
  status chip, recent-diffs history. React popup. React options page
  with license key, telemetry opt-out, clear-history. SAM.gov content
  script with affordance injection via MutationObserver, all selectors
  isolated to `src/content/sam/`. Service worker for side-panel
  opening. Storage layer over chrome.storage + IndexedDB (large
  payloads). PDF report export via pdf-lib + clipboard summary
  export. All visible prose carries the neutral disclaimer.

- **Phase 5 — Backend, licensing, billing.** Platform-agnostic
  serverless handlers in `server/handlers.ts` for health, clauses
  lookup, license validation with HMAC-SHA256 signed responses,
  anonymous telemetry with a structurally-content-free schema, opt-in
  server OCR. Local Node dev server. `LocalLicenseClient` with 14-day
  trial + 7-day offline grace. `TelemetryClient` with persistent
  session UUID, settings-aware opt-out, keepalive POST. Production
  deployment + merchant-of-record integration are external-blocker
  items (see `BLOCKERS.md`).

- **Phase 6 — Hardening & QA.** Corpus expanded to 75 pairs. End-to-end
  PDF round-trip integration test (render via pdf-lib → extract via
  PDF.js → diff → match labels). Reformatting-noise tests with
  ligatures/curly quotes/broken-clause-number noise asserting zero
  changes. Critical-change-buried-in-noise tests asserting detection
  survives. Hand-crafted adversarial tests (clause renumbering, swap,
  cross-section MOVE). Anchor-recall tests on real-world phrasings.
  Performance: 250-page synthetic processes in ~11s (budget 30s).
  Storage corruption-recovery tests. Diff-engine edge-case tests.
  Security audit (`docs/security-audit.md`). Compliance pass with
  no-advisory-language test guarding clause notes, disclaimer, and
  export prose. Accessibility pass: WCAG AA contrast verified for
  every design-system color pair; ARIA labels on dropzones;
  aria-live regions on the loading state.

- **Phase 7 — Launch assets.** Web Store listing copy with keywords
  and permissions justifications. Privacy policy. Terms of service.
  Help center (getting started, what counts as critical, privacy and
  security, FAQ). Single-page marketing site with pricing. Support
  macros library. Visual assets spec + 60-second demo-video script.
  Release runbook with staged rollout and rollback procedure.

- **Phase 8 — Package & launch-ready.** `scripts/package.sh` produces
  `biddiff-v0.1.0.zip` (1.7 MB) ready for Chrome Web Store submission
  after running the full CI gate locally.

## Measured quality metrics

```
Corpus miss-rate audit (75 pairs):
  Expected changes:   120
  Actual changes:     120
  Hits:               120
  Critical missed:    0
  FP on null pairs:   0
  Recall:             100.00%
  Precision:          100.00%

Performance:
  250-page synthetic PDF render → extract → diff
  Total: 11s end-to-end (budget 30s)

Tests:
  178 unit + integration tests passing
  Typecheck: clean
  Lint: clean (max-warnings=0)
  Extension build: clean (1.7 MB packaged)

Accessibility:
  WCAG AA contrast: 6/6 design-system pairs pass

Coverage of architectural rules:
  SAM.gov selectors confined to src/content/sam/: enforced by automated test
  Privacy boundary (licensing/telemetry cannot import doc content): enforced
  Determinism rule (no Date.now/Math.random in diff core): verified
```

## Remaining human action items

Recorded in `BLOCKERS.md`. None of these are code-level; they require
human action and credentials:

1. Buyer validation interviews (Phase 0 of the original plan; product-level).
2. Chrome Web Store developer account creation.
3. Merchant-of-record account + production API key.
4. Cloud deployment for the serverless backend (+ production HMAC secret).
5. Real-world SAM.gov DOM selector validation (requires a logged-in browser).
6. Playwright e2e runtime: requires a Chromium binary in the test env.
7. Final legal review of Privacy Policy and ToS.
8. Chrome Web Store submission itself.

## How to ship

```bash
bash scripts/package.sh
# produces biddiff-v0.1.0.zip ready to upload to the Web Store.
```

Then follow `docs/release-runbook.md` for the manual submission steps.

## Repository

Branch: `claude/biddiff-extension-ijZiE`

# Changelog

## Unreleased — v0.1.0 (code-complete)

### Core (Phases 0–3)

- Canonical document model (`Anchor`, `Block`, `Section`, `StructuredDocument`)
  with UCF letter ↔ section-type mapping and stable content-hash IDs.
- Diff output model (`Change`, `DiffResult`, `TokenSpan`, `ClauseInfo`) with
  pure deterministic engine semantics; `generatedAt` is the only
  non-deterministic field and is set by the caller.
- 62-clause FAR/DFARS dataset with neutral plain-language notes; all
  notes pass the no-advisory-language test.
- Strict text normalization (ligatures, curly quotes, soft hyphens,
  hyphen-broken line wraps, broken clause numbers across whitespace).
- Anchor detectors: FAR/DFARS/GSAR/NFS/VAAR clauses; ISO/US/Month-Day-Year/
  Day-Month-Year and legal-style dates; money, page limits, CLINs
  (context-gated), section references.
- 75-pair synthetic corpus across 5 base templates (IT Services, Navy
  Supplies, NASA Research, AF Construction, DHS 8(a)) — every UCF
  section A–M present; every CRITICAL category exercised; multi-edit
  stress pairs; null pairs.
- Diff engine: section alignment via UCF+heading similarity, block
  alignment via LCS with identical-sequence fast-path and `Int32Array`
  dp, MOVE detection across the whole document, token-level Myers for
  MODIFY, classification (first-match precedence), criticality per the
  spec Part 1.5 ruleset, reformatting-only suppression, clause
  intelligence integration.

### Extraction (Phase 2)

- PDF.js extractor with positioned text items, line clustering, two-column
  detection, cross-page paragraph reassembly, repeating header/footer
  stripping.
- DOCX extractor with table-row pipe-joining.
- Typed `ExtractionError`; magic-byte file kind detection.

### Extension shell (Phase 4)

- MV3 manifest with minimum permissions + explicit CSP.
- React side panel split into small components; dark mode via
  `prefers-color-scheme`.
- Custom-styled drop zones with upfront file-type validation.
- Progress bar with percent + skeleton placeholders.
- Collapsible change cards with side-by-side toggle and mark-as-reviewed.
- History list with unseen dot, per-item delete, hover tooltips.
- Sticky filter bar (severity + section + text search) + clear-filters CTA.
- Keyboard navigation (J/K, R, /) — tip dismissible after first view.
- Markdown clipboard + PDF report with branded header, summary, contents
  page when ≥10 changes, critical-changes section.
- Heavy work in the offscreen document via typed `BidDiffMessage` protocol.
- License chip + Upgrade CTA when trial is in last 3 days/grace.
- Persistent disclaimer dismissal; restorable from Options.
- React ErrorBoundary; AbortSignal-aware pipeline; lastError-swallowing
  runtime sendMessage helper.

### Storage

- chrome.storage + IndexedDB for >4 MB payloads.
- Atomic saveDiff with rollback on index failure.
- Schema versioning; corruption recovery; markViewed / deleteDiff.

### Backend (Phase 5)

- Platform-agnostic handlers: health, clauses, license validation
  (HMAC-SHA256 signed), telemetry (content-free schema), opt-in OCR stub.

### Hardening (Phase 6)

- 75-pair corpus: 100% recall, 100% precision, deterministic.
- End-to-end PDF round-trip.
- Reformatting-noise tests; noise-buried critical changes.
- Hand-crafted adversarial: clause renumber, capitalization-only,
  cross-section MOVE, imbalanced INSERT/DELETE.
- Anchor recall on real-world phrasings.
- 250-page synthetic processes in ~4s extract + 0.07s diff.
- 50-diff memory soak: 1.17× RSS.
- Security audit; compliance pass; WCAG AA contrast.

### Launch assets (Phase 7) + Packaging (Phase 8)

- Web Store listing, privacy policy, ToS, help center, marketing site,
  support macros, release runbook, branded sample PDF report.
- `scripts/package.sh` emits `biddiff-v0.1.0.zip` (1.8 MB).

### Build integrity at code-completion

- 206 tests passing across 37 files.
- TypeScript strict; ESLint `max-warnings=0`; Prettier enforced.
- Production extension build clean.
- All architectural rules enforced by tests (SAM-selector isolation,
  privacy boundary, determinism, no advisory language).

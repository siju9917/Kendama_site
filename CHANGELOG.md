# Changelog

## Unreleased

### Phase 0 — Scaffold + data model

- Initial repo scaffold: TypeScript strict, Vite, React 18, Vitest, ESLint 9 (flat),
  Prettier, CRXJS Vite plugin for Manifest V3.
- MV3 manifest: minimal permissions (storage, sidePanel, offscreen) + SAM.gov host only.
- Canonical document model: `Anchor`, `Block`, `Section`, `StructuredDocument`,
  `DocMetadata`, UCF letter ↔ section-type mapping.
- Diff output model: `Change`, `DiffResult`, `TokenSpan`, `ClauseInfo` + enums.
- Module interfaces: `IExtractor`, `IDiffEngine`, `IClauseClient`, `ISamIntegration`,
  `IStorage`, `ILicenseClient`. `ExtractionError` typed-error class.
- Shared utilities: deterministic FNV-1a content hash, text normalization
  (ligatures, curly quotes, soft hyphens, hyphen-broken line wraps), tokenizer
  preserving clause numbers as a single token, Jaccard + Levenshtein similarity.
- Pure constructors: `buildBlock` / `buildSection` / `buildDocument` produce
  stable content-hash IDs.
- CI gates run locally via `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

### Phase 1 — Test corpus

- Synthetic federal-solicitation corpus: 40 amendment pairs / 80 documents.
- Generator (`test/corpus/generate.ts`) applies parameterized edit operations
  to UCF-complete base templates (IT services, Navy supplies, NASA research).
  Each edit operation emits its own ground-truth label, so labeling error is
  structurally zero.
- Coverage: every CRITICAL category (CLAUSES, DATES_DEADLINES,
  EVALUATION_CRITERIA, SUBMISSION_INSTRUCTIONS, PRICING_CLINS, ATTACHMENTS),
  every change type (INSERT/DELETE/MODIFY), multi-edit stress pairs (up to 6
  edits per amendment), null sanity pairs (identical docs → must emit zero
  changes).
- Corpus harness (`test/corpus/harness.ts`) with `runCorpusAgainstEngine`,
  `evaluatePair`, `formatMetrics`. This is what gates the Phase 3 miss-rate
  audit.
- FAR/DFARS clause dataset (22 curated clauses) bundled in
  `src/core/clauses/data/clauses.ts` with neutral plain-language notes.
  `LocalClauseClient` implements `IClauseClient` for offline lookup.
- Generator consistency check refuses to write a corpus whose labels reference
  text that doesn't appear in the produced documents.
- Generator collision check refuses duplicate `pairId` values.
- All Part 0.4 + Part 17.10 tracking docs initialized.

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
- CI: GitHub Actions runs typecheck + lint + test + build on every push.
- All Part 0.4 + Part 17.10 tracking docs initialized.

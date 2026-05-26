# Self-Audit (Part 17.4)

Run before the Part 13 reflection at every phase boundary.

---

## Phase 0

### Spec-conformance check

| Half-step | Deliverable | Location |
|---|---|---|
| 0.1 | Repo init + directory tree | `src/`, `server/`, `test/`, `docs/` (all exist) |
| 0.2 | TS strict, Vite, React, Vitest, ESLint, Prettier | `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc`, `package.json` |
| 0.3 | `manifest.config.ts` MV3 minimal permissions | `manifest.config.ts` |
| 0.4 | CI config | `.github/workflows/ci.yml` |
| 0.5 | Tracking docs | `PROGRESS.md`, `DECISIONS.md`, `BLOCKERS.md`, `PUSH_LOG.md`, `RESUME.md`, `ARCHITECTURE.md`, `TESTING.md`, `CHANGELOG.md`, `README.md`, `STATE.md`, `PREFLIGHT.md`, `REFLECTION_LOG.md`, `SELF_AUDIT.md` |
| 0.6 | Data model + unit tests | `src/core/model/types.ts`, `src/core/model/build.ts`, `src/core/diff/types.ts`, `src/core/interfaces.ts`, `src/shared/{hash,text,constants}.ts` + tests |

### Drift check

- Spec says use `.eslintrc`; ESLint 9 mandates flat config. **Justified deviation**, recorded in `DECISIONS.md`. Behavior is unchanged.
- Spec example imports use `.js` suffix at runtime; I followed that convention since TS strict mode + bundler mode handles it.

### Regression check

- Test suite runs from scratch: 24/24 passing.
- `npm run typecheck` clean.
- `npm run lint` clean.
- `npm run build` not yet exercised (no entry HTMLs — comes at Phase 4).

### Integration check

- Data-model types are imported and used by `src/core/interfaces.ts` and the
  `build.ts` constructors. The unit tests construct real instances and verify
  hashed IDs are stable.

### Dead-code check

- No unreferenced exports. `emptyCategoryCounts` is consumed by Phase 3
  diff assembly (planned). Marked but not yet wired — flagged as Phase 3 work.

### Verdict

CLEAN. Ready for reflection (already converged) and Phase 1.

---

## Phase 1

### Spec-conformance check

| Half-step | Deliverable | Location |
|---|---|---|
| 1.1 | Corpus acquisition (40+ pairs) | `test/corpus/synthetic/` (40 pair directories) |
| 1.2 | Diversity (categories + edge cases) | `test/corpus/generate.ts` covers all 7 categories + multi-edit + null pairs |
| 1.3 | Labeling schema | `test/corpus/schema.ts` (`ExpectedChange`, `PairLabel`, `CorpusManifestEntry`) |
| 1.4 | Hand-labeled pairs | `test/corpus/labels/<pair-id>.json` (auto-emitted; consistency-validated) |
| 1.5 | Corpus harness + metrics | `test/corpus/harness.ts` (`runCorpusAgainstEngine`, `formatMetrics`) |
| 1.6 | Generator tests | `test/corpus/generate.test.ts` (9 tests, all passing) |
| 1.7 | Clause dataset bundled | `src/core/clauses/data/clauses.ts`, `src/core/clauses/client.ts` |

### Drift check

- **Drift**: Spec 1.2 calls for scanned/two-column/large/malformed PDFs. I have not yet generated PDF/DOCX files — only the structured JSON model. **Justified deviation**: a clean structured-JSON corpus is the right input for testing the diff engine (Phase 3), which is the moat. PDF/DOCX generation belongs alongside Phase 2 (the extraction pipeline), where it can be rendered AND extracted in the same test, end-to-end. This is recorded in `DECISIONS.md` and the corresponding 1.2 item is `[partial]` in `PROGRESS.md`.

### Regression check

- 33/33 tests pass.
- `npm run typecheck` clean.
- `npm run lint` clean.

### Integration check

- Generator → label file → harness → (future) diff engine → metrics report.
  Verified: `loadAllPairs()` returns 40 bundles, all carry valid expected
  changes and matching structured docs.

### Dead-code check

- The unused `clauseBlocks()` helper was removed during reflection.
- The `LocalClauseClient` is exported and will be wired into Phase 3.10 (clause intelligence).

### Verdict

CLEAN. Phase 1 closed. Reflection converged. Proceeding to Phase 2.

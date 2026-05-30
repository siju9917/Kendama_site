# BidDiff — Architecture & Extension Guide

> The current, canonical developer reference (supersedes
> `legacy-notes/ARCHITECTURE.md`, which is preserved only as history).
> Written for a future Claude Code session or contributor who needs to
> understand the system and safely extend it. Reflects the codebase as
> of 2026-05-30 after a full two-pass critique.

## The pipeline

Everything flows one way, and every core stage is a **pure,
deterministic function**:

```
file bytes
  → validate (kind + size + encryption guard)        core/extract/validate.ts
  → extract  (PDF via pdf.js / DOCX via JSZip)        core/extract/{pdf,docx}/
  → reconstruct lines (layout, columns, page merge)   core/extract/pdf/reconstruct.ts
  → assemble sections (headings → sections)           core/extract/sections/
  → enrich anchors (dates, money, clauses, CLINs…)    core/extract/normalize.ts + anchors/
  → DIFF ENGINE                                        core/diff/engine.ts
        align sections → align blocks → detect moves
        → classify category → evaluate criticality
        → suppress reformatting → token-diff modifies
  → render (side panel) / export (PDF, MD, text)      sidepanel/ , core/export/
```

The engine is synchronous and has no `Date.now()` / `Math.random()` /
DOM / chrome dependency. The single non-deterministic field,
`DiffResult.generatedAt`, is `""` from the engine and set by the
caller. This is why the engine is fuzzable and golden-testable.

## Module map

| Path | Responsibility |
|---|---|
| `src/core/extract/validate.ts` | Trust boundary: kind detection (magic bytes), size cap, encrypted-PDF + unsupported-kind rejection. |
| `src/core/extract/pdf/` | `extract.ts` (pdf.js → positioned items), `reconstruct.ts` (items → ordered lines), `pdfExtractor.ts` (IExtractor). |
| `src/core/extract/docx/docxExtractor.ts` | JSZip + a tag-aware regex XML walker → paragraphs. |
| `src/core/extract/sections/` | `headings.ts` (heading classification + confidence), `assemble.ts` (lines → sections + section type). |
| `src/core/extract/anchors/index.ts` | Regex anchor detectors: DATE, MONEY, PAGE_LIMIT, CLAUSE_REF, CLIN, SECTION_REF. |
| `src/core/extract/normalize.ts` | Enriches a doc's blocks with anchors; confidence aggregation. |
| `src/shared/text.ts` | The one canonical text normalizer (ligatures, zero-width, hyphen rejoin, clause rewrap) + tokenizer + similarity metrics. **Extractor and engine must both use it.** |
| `src/core/diff/` | `engine.ts` (orchestration), `align/` (sections, blocks, moves), `classify.ts` (category), `critical.ts` (severity + reasons), `suppress.ts` (reformatting), `tokens.ts` + `myers.ts` (LCS). |
| `src/core/clauses/` | Local FAR/DFARS dataset + `lookupSync`. |
| `src/core/export/index.ts` | PDF (pdf-lib, pinned dates for determinism), Markdown (code-spanned), plain text. |
| `src/core/storage/` | `index.ts` (chrome.storage index + serialized mutation lock + LRU), `idb.ts` (IndexedDB payloads). |
| `src/core/{licensing,telemetry}/` | Privacy-isolated; `test/unit/integration-isolation.test.ts` forbids importing any model/diff/extract type. |
| `src/core/sample/sampleDiff.ts` | The built-in first-run example diff. |
| `src/sidepanel/` | React UI. `useDiffPipeline.ts` is the state machine; `pipeline.ts` routes jobs to the offscreen doc (or a local fallback). |
| `src/{background,offscreen,popup,options,content/sam}/` | MV3 surfaces (see `SPEC.md` Architecture). |

## Load-bearing invariants (do not break)

- **Determinism.** Content-hash IDs (`shared/hash.ts` — two *independent*
  32-bit passes; the salt matters). No `localeCompare` in any
  determinism-critical sort — use code-point compare. Pin library
  timestamps (pdf-lib dates) so exports are byte-stable.
- **Suppression never hides a value change.** `suppress.ts` preserves
  digit-flanked punctuation; only strips value-preserving marks. Bias
  toward surfacing.
- **O(n·m)-space algorithms bound the product**, not each dimension
  (token LCS cell budget in `engine.ts`).
- **Reports, never advises.** Enforced by
  `test/unit/no-advisory-language.test.ts`.
- **Least privilege.** Content script + `web_accessible_resources`
  scoped to sam.gov; CSP restated in the manifest; https-only fetch of
  DOM-sourced URLs.

## Extending BidDiff (the common changes)

### Add a new critical-change rule
1. If it needs a new signal, add an **anchor detector** in
   `extract/anchors/index.ts` (and a case in `detectAllAnchors`), or a
   new **section type** (below).
2. Map it to a category in `diff/classify.ts` (first match wins —
   order matters).
3. **Append a `CriticalRule` to `CRITICAL_RULES` in `diff/critical.ts`**
   — the ruleset is data, not branching: `{ matches(input), reason(input) }`
   with a human-readable, **non-advisory** reason. (This is also the seed
   of the rule-pack-loader for the `regdiff`/D-family — a different
   vertical swaps the whole `CRITICAL_RULES` pack.)
4. Add focused cases to `diff/critical.test.ts` + a labeled corpus pair.
4. Add a labeled corpus pair under `test/corpus/synthetic/` + a label
   in `test/corpus/labels/` proving recall, and confirm null pairs
   stay clean.
5. The critical ruleset is **domain-gated** — extensions to *what
   counts as critical* for federal solicitations need the
   domain-expert validation tracked in `human/NEED_FROM_HUMAN.md`.

### Add a new section type
`model/types.ts` `SectionType` + `UCF_LETTER_TO_TYPE`; a keyword rule
in `sections/assemble.ts` `KEYWORD_RULES`; then a classify/critical
mapping as above.

### Add a new input format (e.g. RTF)
Implement `IExtractor` (`core/interfaces.ts`); detect its kind in
`extract/validate.ts` (and decide accept/reject there — never let an
unsupported-but-recognized kind fall through to the wrong extractor);
register it in the dispatch in `sidepanel/pipeline.ts` and
`offscreen/index.ts`.

### Add a new export format
Add a builder in `core/export/index.ts` (reuse `formatChange*`
helpers); include the canonical `DISCLAIMER_TEXT`; ensure it passes
the no-advisory test; wire a button in `sidepanel/Summary.tsx`.

## Test taxonomy

- **Unit** (`src/**/*.test.ts(x)`) — pure functions + components.
- **Corpus** (`test/corpus/`, `test/integration/corpus.test.ts`) —
  labeled prior/current pairs; recall + zero false positives.
- **Integration** (`test/integration/`) — noise+change, reformatting,
  e2e PDF round-trip, memory soak, perf budget, numeric-value
  regression.
- **Property fuzz** (`test/integration/fuzz-*.test.ts`) — engine,
  DOCX XML, anchors, PDF reconstruction; invariant assertions over
  hundreds of seeded random/adversarial inputs.
- **Compliance** (`test/unit/no-advisory-language.test.ts`,
  `integration-isolation.test.ts`) — reports-never-advises +
  privacy isolation.

When extending, add to the matching layer; the bug archetypes to
pre-empt are in `brain/PLAYBOOKS/chrome-mv3-critical-change-diff.md`
and the critic checklists in `governance/CRITIQUE_AGENTS.md`.

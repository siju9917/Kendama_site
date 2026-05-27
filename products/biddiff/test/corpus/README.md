# Test Corpus

Synthetic federal-solicitation corpus + hand-labeled ground truth.
Generation is deterministic so the corpus is fully reproducible from source.

## Layout

```
test/corpus/
├── README.md                          (this file)
├── manifest.json                      generated catalogue of every pair
├── synthetic/<pair-id>/
│   ├── prior.json                     baseline StructuredDocument
│   ├── current.json                   amended StructuredDocument
│   └── meta.json                      pair metadata (description, edits applied)
├── labels/<pair-id>.json              ground-truth changes (the truth set)
├── raw/                               optional: real PDFs (none until human supplies)
└── generated-pdf/<pair-id>/           PDF/DOCX renders for end-to-end extraction tests
```

## Why synthetic

See `DECISIONS.md` — public PDF endpoints refused programmatic download and
SAM.gov requires authentication. The generator-as-truth approach has the
benefit that ground-truth labels are mechanical, not hand-typed, so labeling
error is zero. The diff engine is tested against EXACTLY what was changed.

## How to regenerate

```bash
npx vitest run test/corpus/generate.test.ts    # validates the generator
npx tsx test/corpus/generate.ts                # regenerates everything
```

## Adding real corpus documents

Drop real solicitation pairs into `test/corpus/raw/`. A separate harness
(Phase 2.x) feeds them through the real extraction pipeline. Their labels
must be hand-written into `labels/<pair-id>.json`.

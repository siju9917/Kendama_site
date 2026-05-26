# Resume

If this build is interrupted and restarted, read this first along with
`PROGRESS.md` and `STATE.md`.

## Current state

- Phases 0 and 1 complete and committed. Tests green (33/33).
- Phase 2 (extraction pipeline) starts next.

## Last completed step

- 1.5 — Corpus harness (`test/corpus/harness.ts`) with metrics + tests.

## Next action

- 2.1 PDF text extraction with PDF.js. Implements `IExtractor`. Goal:
  produce `StructuredDocument` from a PDF ArrayBuffer matching the same
  structure the synthetic generator produces. Then 2.2 DOCX, 2.3 layout
  reconstruction, etc.
- A side task: extend the corpus generator to also render its synthetic
  documents into PDF and DOCX files so the extraction pipeline can be
  tested end-to-end (extract real bytes → diff → compare to known labels).

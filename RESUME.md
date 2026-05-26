# Resume

If this build is interrupted and restarted, read this first along with
`PROGRESS.md` and `STATE.md`.

## Current state

- Phase 0 (scaffold + data model) is complete and committed. Tests green (24/24).
- Phase 1 (test corpus) starts next.

## Last completed step

- 0.6 — Canonical data model implemented and unit-tested.
  - `src/core/model/types.ts`, `src/core/model/build.ts`
  - `src/core/diff/types.ts`, `src/core/interfaces.ts`
  - `src/shared/{hash,text,constants}.ts` + tests

## Next action

- 1.1 Corpus acquisition. Attempt real SAM.gov solicitation download via the
  public Opportunities API. If unavailable, generate a synthetic but
  high-fidelity corpus that exercises every Phase 2/3 code path. Either way,
  every amendment pair receives a `test/corpus/labels/<pair-id>.json` label.

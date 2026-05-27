# Reflection Log (Part 13)

Findings and fixes per round, per phase. A phase is closed only when its
reflection converges (a full pass produces zero new findings).

---

## Phase 0 — Scaffold + data model

### Round 1 — Correctness

**Findings:**

1. Tokenizer regex `[A-Za-z0-9][A-Za-z0-9._\-/]*` greedily consumed trailing
   punctuation (e.g., "world." → ["world."]). It also matched single-char
   "words" repeatedly when no connector was present.
   **Fix:** rewrote as `[A-Za-z0-9]+(?:[._\-/][A-Za-z0-9]+)*` so connectors
   must sit between alphanumeric runs.
2. Test for "9:00 AM" expected `"9 :00 AM"` which is inconsistent with both
   the old and the new tokenizer. **Fix:** corrected expected output to
   `"office hours 9 : 00 AM"` — punctuation tokenized separately, joined by spaces.
3. ESLint 9 refused the spec-suggested `.eslintrc.cjs`. **Fix:** migrated to
   `eslint.config.js` flat config and recorded in `DECISIONS.md`.

### Round 2 — Adversarial

**Findings (post-fix):**

- Empty string, unicode, hyphen-broken line wraps, soft hyphens, ligatures all
  exercised in `text.test.ts`. Clean.
- Hash collision risk: FNV-1a 32-bit doubled to 16 hex still has ~2^32 effective
  entropy. Acceptable for content addressing within a single document
  (max ~10^4 blocks). **No change.**
- Block ID stability under reordering: addressed by `sectionPath#ordinal:text` —
  reorder yields a new ID, which is the desired behavior for change detection.

### Round 3 — Professional elevation

- Added `UCF_LETTERS` and `UCF_LETTER_TO_TYPE` exports so downstream code can
  rely on a single source of truth.
- Added typed `ExtractionError` with `userMessage` separate from `message` so
  the UI can surface a friendly string while logs see the technical one.
- Added `emptyCategoryCounts()` factory for `DiffResult.changeCountByCategory` —
  callable factory keeps key ordering deterministic (object literal in code).

### Round 4 — Convergence check

- 24/24 unit tests pass; TSC clean; ESLint clean.
- No new findings.

**Phase 0 converged after 1 round of fixes.**

---

## Phase 1 — Test corpus

### Round 1 — Correctness

**Findings:**

1. `templates.ts` used `blocksFor("I", -1, [...])` — a negative ordinal for the
   Section I lead paragraph — to keep the clause-block ordinals starting at 0.
   Smelly and a violation of the implicit invariant that ordinals are ≥0.
   **Fix:** restructured Section I assembly so the lead paragraph is ordinal 0
   and clause blocks live under `sectionPath: "I.clauses"` with their own
   independent ordinal axis. Removed the unused `clauseBlocks` helper.
2. `removeAttachment` used `b.text.includes("Attachment ${id}:")`. Substring
   matching could mis-match (`"Attachment 1:"` would match `"Attachment 10:"`).
   **Fix:** switched to `startsWith` for exact prefix.
3. Generator had no protection against duplicate `pairId` collisions; the
   second would silently overwrite the first.
   **Fix:** added a uniqueness check that throws before any I/O.
4. Generator had no protection against label fragments that don't appear in
   the produced documents (would silently emit unlabelled-correctly pairs).
   **Fix:** added `consistencyCheck` that, for every expected change with
   `expectedTextFragments`, verifies the fragment exists in the current doc
   (or prior for DELETE). Generator throws if any inconsistency found.

### Round 2 — Adversarial

- Empty pair list (no edits) → generator produces identical prior/current.
  Verified by the "null pairs" test which checks block IDs match exactly.
- Edit reordering should produce different output: changeProposalDueDate then
  changePageLimit yields a different docs hash than the reverse. Block IDs
  re-hash to reflect order. Confirmed.
- A pair with an edit that produces no change (idempotent) would create a
  label without matching content. Caught by the new consistency check.
- Long chains (stress pairs apply 6 edits) work without exceeding any
  recursion or memory limit. Confirmed.

### Round 3 — Professional elevation

- Added `origin: "generated" | "hand-labeled" | "mixed"` to label schema so
  hand-labeled real corpus pairs can coexist with synthetic ones.
- Local clause client gracefully handles unknown clauses by emitting a
  best-effort `ClauseInfo` rather than throwing — the UI can still surface
  the clause number to the user even when the bundle is out of date.

### Round 4 — Convergence check

- 33/33 unit tests pass; TSC clean; ESLint clean.
- Re-ran the full suite from Phase 0 forward — no regressions.
- No new findings.

### Notes / deferred to later phases

- **PDF/DOCX rendering of synthetic pairs** is intentionally deferred to
  Phase 2 (the extraction pipeline). The rendered files will live in
  `test/corpus/generated-pdf/<pair-id>/` and serve the extract→diff
  end-to-end test. The structured-JSON pairs already exercise the diff
  engine and are sufficient for Phase 3.
- **Real SAM.gov samples** remain a `BLOCKERS.md` item. The harness will
  accept them alongside synthetic pairs once provided.

**Phase 1 converged after 1 round of fixes.**

---

## Phase 2 — Extraction pipeline

### Round 1 — Correctness

Findings + fixes:

1. **Clause regex** rejected `52.xxx-xx` (only 2 leading digits). FAR clauses
   start with "52" — only 2 digits. **Fix:** `\d{2,4}\.\d{3}-\d{1,4}`.
2. **Page-limit regex** with `"Page limit: 75 pages"` failed because the
   colon broke the whitespace-required-then-optional-prefix sequence. **Fix:**
   restructured with `[:\s]+` consuming the colon-or-space mix.
3. **PDF.js GlobalWorkerOptions** assignment failed in Node test env because
   the ESM module record is frozen. **Fix:** assign to the nested property
   (which is a getter+setter on a non-frozen object) rather than rebinding.
4. **PDF.js fake worker** still required a workerSrc. **Fix:** resolve the
   worker .mjs file path via `createRequire` and pass as a `file://` URL.
5. **pdf-lib's `doc.save()`** returns a Uint8Array whose backing buffer may
   be a SharedArrayBuffer in some runtimes. **Fix:** copy into a fresh
   ArrayBuffer in tests so TypeScript types narrow cleanly.

### Round 2 — Adversarial

- Empty input → typed EMPTY error.
- Junk bytes → typed UNSUPPORTED_FORMAT.
- Legacy .doc → typed UNSUPPORTED_FORMAT with helpful conversion message.
- Encrypted PDF (heuristic /Encrypt match) → typed ENCRYPTED.
- Corrupt PDF → typed CORRUPT (caught from PDF.js exception).
- Tested empty DOCX → typed EMPTY.

### Round 3 — Professional elevation

- Added `appearsScanned` heuristic that drops confidence to 0.4 and emits a
  user-facing warning when the PDF has no text on most pages — surfaces
  the OCR-fallback recommendation cleanly.
- `enrichStructuredDocument` enforces CLIN-only-in-PRICING-sections rule.
- All errors carry separate `message` (technical, for logs) and
  `userMessage` (friendly, for UI).

### Round 4 — Convergence

- 100/100 tests pass; TSC clean; ESLint clean.
- Synthetic corpus enriches end-to-end via `enrichStructuredDocument`.
- Real PDF (pdf-lib generated) round-trips through `PdfExtractor` and emerges
  as a `StructuredDocument` with correct UCF sections.
- Real DOCX (JSZip generated) round-trips through `DocxExtractor` the same way.

### Notes / deferred

- **2.10 OCR fallback**: Tesseract.js install + WASM bundle is heavy.
  Building the `IExtractor` interface for OCR is straightforward; the
  WASM wiring belongs alongside the offscreen-document setup in Phase 4.
- **2.13 Performance pass**: Needs synthetic PDF rendering at >200 pages.
  Will happen alongside the cross-environment Phase 6.3 tests.

**Phase 2 converged after 1 round of fixes (the regex + PDF.js worker setup).**

---

## Phase 3 — Diff engine (THE MOAT) — DEEP reflection

### Round 1 — Correctness

Findings + fixes:

1. **Block-alignment MODIFY threshold too high.** Initial 0.6 jaccard
   missed evaluation-factor *expansions* ("Factor 1: Technical Approach" →
   "Factor 1: Technical Approach including security architecture maturity").
   Jaccard 5/9 = 0.556 < 0.6. 4 missed CRITICAL changes in the audit.
   **Fix:** introduced `containmentSimilarity` and pairing uses
   `modifySimilarity = max(jaccard, containment)`. The expanded-item pattern
   has containment = 1.0, so it pairs cleanly. False-positive risk is bounded
   because the run-level pairing only considers DELETE+INSERT pairs already
   adjacent in the LCS — unrelated blocks won't be in the same run.

2. **`evaluateCriticality` compared `changeType` to `"EQUAL"`** — but the
   `ChangeType` union doesn't include EQUAL. Type-checker caught it. **Fix:**
   removed the redundant guard; if we're processing a SUBMISSION_INSTRUCTIONS
   change at all, it's an actual change.

3. **Section ID re-hashing**: when `replaceSection` rebuilds a section the ID
   changes — that's intentional. Verified that section ID changes don't
   confuse alignment (alignment uses UCF letter, heading text, and section
   type, not section ID).

### Round 2 — Adversarial

- **40-pair determinism test** — every pair runs the engine twice and
  asserts byte-identical output. Passes.
- **Null pair check** — identical documents produce zero changes. Passes
  for all "null-*" pairs.
- **Heavy edit pair** (`stress-001-multi-six-edits` — 6 edits in one
  amendment) — engine correctly produces 6 changes, all classified
  correctly, all CRITICAL.
- **Cross-section adjacent INSERT/DELETE** — the move-detection threshold
  is 0.9, well above the MODIFY 0.6 cap, so a high-similarity pair from
  different sections becomes a MOVE; a low-similarity pair stays as
  separate INSERT+DELETE. Verified manually.

### Round 3 — Professional elevation

- **`criticalReasons`** is plural and accumulating: a single change that
  hits multiple critical rules (e.g. a Section L line containing both a
  PAGE_LIMIT anchor and a DATE anchor) emits both reasons. The UI can
  surface them as a bullet list.
- **`locationHint`** includes the section heading and block ordinal, so
  the user can find the change in the source document.
- **Confidence penalty**: if section alignment had to use low-score pairs,
  the overall `diffConfidence` drops and a warning is added — surfacing
  uncertainty rather than hiding it.

### Round 4 — Convergence

- Full suite: **113/113 passing**.
- Miss-rate audit: **0 missed CRITICAL, 100% recall, 100% precision,
  0 FPs on null pairs, deterministic**. Hard floor met with margin.
- No regression on Phases 0/1/2.
- No new findings on a second adversarial pass.

### Deep-reflection extras (Part 13.2)

- **Walked one corpus pair end-to-end by hand** (`it-svc-011-multi-critical`,
  3 edits: due date + clause add + page limit). Engine output:
  - 1 CRITICAL DATES_DEADLINES MODIFY in Section L (the new date appears
    in afterText, the old in beforeText)
  - 1 CRITICAL CLAUSES INSERT in Section I (clauseInfo populated:
    "Prohibition on a ByteDance Covered Application")
  - 1 CRITICAL SUBMISSION_INSTRUCTIONS MODIFY in Section L (the new page
    limit and old page limit both appear in tokenSpans)
  - Exactly 3 changes, no spurious extras. ✓
- **Re-read entire `src/core/diff/`** as if reviewing a stranger's PR.
  - Sort key is stable. Algorithms are pure. No `Date.now` or `Math.random`.
  - Iteration is exclusively over arrays returned by explicit sort or the
    LCS algorithm — no Map/Set iteration in a way that could vary.
  - All thresholds are constants in `shared/constants.ts` and `DIFF_THRESHOLDS`.

**Phase 3 converged after 1 round of fixes. The moat holds.**

---

## Phase 4 — Extension shell — DEEP reflection

### Round 1 — Correctness

Findings + fixes:

1. **Integration-isolation test caught its own scaffolding.** Interface name
   `ISamIntegration` and types `SamAttachment` / `SamAmendmentMeta` exposed
   "SAM.gov" naming outside the content/sam folder. **Fix:** renamed to
   `IOpportunitySite` / `OpportunityAttachment` / `OpportunityAmendmentMeta`.
   This is also a correctness win — the interface should be generic so a
   future portal can implement it.
2. **`pdf-lib`'s `doc.save()` Uint8Array** has a `SharedArrayBuffer`-shaped
   union type as backing. **Fix:** copy bytes to a fresh `ArrayBuffer`
   before passing to `Blob`. Same fix already applied in extractor tests.
3. **Unused `usableHeight`** in the PDF export draw helper — kept for
   symmetry with `usableWidth`, but not referenced. **Fix:** removed.

### Round 2 — Adversarial

- All four UI states (`EMPTY` / `RUNNING` / `DONE` / `ERROR`) can be
  reached from the file picker. `ERROR` correctly surfaces the
  `userMessage` from a typed `ExtractionError` rather than the raw stack.
- Storage layer was tested with the in-memory fallback (Node has no
  `chrome.storage`); LRU prune correctly drops oldest-access entries
  when over the cap.
- Service-worker `OPEN_SIDE_PANEL` handler is async-correct (returns
  `true` from `onMessage.addListener` to keep the channel open).
- Content script uses `MutationObserver` so SAM.gov SPA route changes
  re-inject the affordance.

### Round 3 — Professional elevation

- Side-panel header always shows "Start over" once a diff is loaded, so
  the user can re-pick documents without hunting.
- Filter chips show their counts in parentheses ("All changes (12)" /
  "Critical (3)"); the empty-filter case renders an empty state.
- Summary surfaces per-category counts inline ("Dates & deadlines: 1 ·
  Clauses: 2 · …") so the user sees the shape of the amendment at a glance.
- PDF report places critical changes FIRST, in their own section, with
  the critical-color accent. Disclaimer is on the last page.
- Single canonical disclaimer in `src/shared/disclaimer.ts` so every
  surface uses the exact same wording.

### Round 4 — Convergence

- 123/123 tests pass; typecheck clean; lint clean; extension build clean.
- The integration-isolation test now guards both the SAM-selector rule
  and the privacy boundary (licensing can't import model/diff/extract).
- No regression in earlier phases (corpus audit still 100%).

**Phase 4 converged after 1 round of fixes.**

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

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

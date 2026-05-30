# BidDiff — PROGRESS

> Phase / half-step tracking. Each row is a phase; each phase
> closes only after the full critique panel converges clean per
> `governance/CRITIQUE_AGENTS.md` Section 5.3 and the
> escalation rule 5.7.2.

The pre-migration phase history is preserved in
`legacy-notes/PROGRESS.md`. The table below tracks BidDiff
**under Kendama governance** going forward.

---

## Status as of 2026-05-27 (migration)

The BidDiff codebase entered Kendama with:

- 226 / 226 tests passing
- lint clean (`npm run lint`)
- typecheck clean (`npm run typecheck`)
- deterministic diff-engine corpus audit: 100% recall, 0 false
  positives on null pairs
- "reports, never advises" automated test passing
- many internal critique iterations completed under the prior
  loose process

These are inputs to the **first formal Kendama panel pass**, not
substitutes for it.

---

## Phases under Kendama governance

| # | Phase | Critique panel convergence (cycles) | Closed |
|--:|---|---|---|
| K1 | First formal full-panel pass against the migrated codebase. Critics 1–14 of `governance/CRITIQUE_AGENTS.md`, in particular: Ambition Critic (#13) on the product's scope vs. ceiling, Research Quality Critic (#14) on the supporting research, Domain-Expert Critic on the federal-procurement specifics. Iterate to convergence; escalate per 5.7.2. | _pending_ | _no_ |
| K2 | Ship-gate dry run against `governance/QUALITY_BAR.md`. Defend every item with cited evidence. Address findings. | _pending_ | _no_ |
| K3 | Chrome Web Store submission package — staged for the human submission step (one of the `human/NEED_FROM_HUMAN.md` items, added when K2 closes). | _pending_ | _no_ |

---

## Documented coverage observations — evidence for K1 BD2 (Domain-Expert P1)

Found during the 2026-05-30 adversarial bug-hunt pass while reading
`src/core/extract/anchors/index.ts`. These are **extraction-coverage
gaps**, logged as concrete evidence for the open Domain-Expert P1
(BD2). They are NOT being changed this cycle: the critical-changes
ruleset is human-gated pending the domain-validation responses
(`human/NEED_FROM_HUMAN.md` item 4). Recording them so the next
session has specifics, not a vague "improve extraction":

1. **Money magnitude suffixes not parsed. — ADDRESSED 2026-05-30.**
   `MONEY_RE` matched `$1.5M` as the value `1.00` (it stopped at the
   decimal's single digit and ignored the `M`/`K`/`B`/`million`/
   `billion` suffix). `detectMoney` now parses an optional decimal of
   any length plus a magnitude suffix and normalizes to the true
   value (`$1.5M → 1500000.00`, `$2.3 million → 2300000.00`). This is
   pure extraction correctness — the MONEY anchor feeds classification
   by *presence* only, never by value, and no test asserted the value,
   so this does not touch the gated critical ruleset. 3 new tests in
   `src/core/extract/anchors/index.test.ts`; full suite 246/246.
2. **Spelled-out page limits with parenthetical not matched.**
   `PAGE_LIMIT_RE` requires digits immediately after the lead phrase,
   so "shall not exceed ten (10) pages" — a very common federal
   phrasing — is missed. Candidate fix: allow an optional
   spelled-number + parenthetical digit form.
3. **US date validity not checked.** `US_DATE_RE` accepts "02/30/2026"
   and normalizes it to an impossible ISO date. Low impact for diff
   (string comparison still flags the change) but worth a validity
   guard so a normalized anchor is never a non-existent date.

These feed both `src/core/diff/critical.ts` extension work AND the
Domain-Expert Critic checklist strengthening, once BD2's human
validation lands.

## After ship (forward look)

Once BidDiff passes the ship gate and the human completes the
store submission, it enters `STATUS: shipped` and immediately
gains the recurring obligations:

- Monthly full re-critique (5.7.1).
- Cycle-cadence "nothing is ever done" re-opening review (5.7.4).
- Weekly continuous bug-hunt with newly invented inputs (5.7.5).
- Continuous polish in the POLISH loop (PART 4.3).

A product is never finished. The bar is permanent.

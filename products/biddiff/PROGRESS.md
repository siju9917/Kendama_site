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
| K2 | Ship-gate dry run against `governance/QUALITY_BAR.md`. Defend every item with cited evidence. Address findings. | **Dry run ran 2026-05-30** → `docs/ship-gate-dry-run.md`. Engineering bar defended with evidence on every axis. Closed 2 of 3 unblocked hygiene gaps (security-audit re-confirm + `tar` override 11→7 vulns; current CHANGELOG). | _no — does not pass: 3 K1 P1s + 2 P2s + 1 hygiene item still open_ |
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
3. **US date validity not checked. — ADDRESSED 2026-05-30.**
   `US_DATE_RE` (and the ISO + month-name forms) accepted
   calendrically-impossible dates like "02/30/2026" and normalized
   them to an impossible ISO date. `detectDates` now validates each
   candidate against a real calendar (with leap-year handling) and
   drops impossible ones — they are typos or false matches, and the
   block-level diff still surfaces any surrounding change. Non-gated
   extraction correctness. New test cases in
   `src/core/extract/anchors/index.test.ts`.

4. **Letter-dot-number subsections for sections A–K not detected.**
   `classifyHeading` recognizes "L.1"/"M.2" items (SECTION_LM rule) but a
   matching "C.3 Performance Work Statement" for sections A–K matches no
   rule and returns NONE (letter-dot needs a space after the dot; the
   numbered rule needs a leading digit). Low impact: the line still sits
   inside its parent UCF section, so the section TYPE is preserved — only
   sub-section granularity is lost. Candidate fix: a SECTION_AK_ITEM rule
   mirroring SECTION_LM for A–K, validated against domain-expert input
   (BD2). Characterized (not changed) in headings.test.ts (bug-hunt 16).

These feed both `src/core/diff/critical.ts` extension work AND the
Domain-Expert Critic checklist strengthening, once BD2's human
validation lands.

## K2-surfaced hygiene tasks (from the ship-gate dry run)

- **[DONE 2026-05-30]** Security-audit re-confirm + `npm audit` →
  pinned a patched `tar` (`overrides`), 11→7 vulns; documented the
  shipped bundle as vuln-free (`docs/security-audit.md`).
- **[DONE 2026-05-30]** Current top-level `CHANGELOG.md`.
- **[DONE 2026-05-30]** Assert an explicit bundle-size budget.
  `scripts/check-bundle-size.mjs` (gzipped, pdf.js worker excluded:
  largest chunk ≤ 230 kB gz, total ≤ 460 kB gz) wired into
  `scripts/ci.sh`; budget documented in `SPEC.md`. Observed: total
  396.7 kB gz, largest 175.8 kB gz — within budget.
- **[OPEN, ship-gate P1, human-gated]** OCR disclosure accuracy
  (Compliance, `CRITIQUE_LOG.md` bug-hunt pass 7): the privacy policy /
  store listing / options copy describe an opt-in server-OCR data flow
  that is stubbed + unwired. Before the store submission, EITHER scope
  the copy to on-device-only (recommended, stronger privacy claim) OR
  implement+wire OCR. Routed to `human/NEED_FROM_HUMAN.md` item 7.
- **[OPEN, maintenance]** Bump the Vite 5→6/7 + Vitest 2→3 toolchain
  to clear the 7 dev-only `npm audit` advisories. Breaking; needs full
  re-verification (config + plugin compat + suite). Not a shipped-risk
  item (those advisories don't ship). Do it in a dedicated cycle.

## "Nothing is ever done" review (5.7.4) — 2026-05-30

Mandated re-opening review: challenge the premise that BidDiff's
current state is as good as it gets. What would a top-tier team add?
These are **improvements** (not bugs — the bug-hunt is separate), each
tagged with its gate. Promising ones become POLISH/BUILD tasks.

| # | Improvement (what a top-tier team would add) | Gate | Disposition |
|---|---|---|---|
| N1 | **Try-it-without-files sample diff** — a "See an example" button that loads a bundled before/after so a first-run user reaches value with zero setup. | none | POLISH — strong first-run win; zero-cost. Queued. |
| N2 | **History row a11y** — the row is `role="button"` with a nested ✕ `<button>` (invalid interactive nesting). Refactor to sibling buttons (open + delete), no nesting. | none | **DOING NOW** — clear a11y fix, verifiable via History.test. |
| N3 | **Redline DOCX export** — capture teams live in Word; a redline `.docx` is what they'd attach to a review. Buildable with the existing JSZip dep (DOCX is a zip of OOXML) — **no new dependency**. | **human (visual verify)** | POLISH — high buyer value, no new dep. BUT a user-facing Word export must render *professionally* in Word, which can't be verified headless. Gate: build it behind structural tests (valid OOXML, contains the change text + disclaimer) + a one-time human visual check before exposing the button. Queued with that gate. |
| ~~N4~~ | ~~"What changed since I last viewed"~~ | — | **DROPPED (self-audit).** Ill-formed: a saved diff is static once computed, so there's nothing "new" within it on re-open. The only meaningful "what's new" signal is *which diffs* are unseen — already covered by the History unseen-dot. No work. |
| N5 | **Change-list virtualization** for pathological diffs (DiffView renders every card). Realistic amendments are <~150 changes (fine), but a defensive cap/windowing protects the tail. | none | POLISH (low priority at realistic scale) — note the Performance-critic "virtualize where needed"; revisit if a real >500-change diff appears. |
| N6 | **Keyboard-shortcut help overlay** (`?` opens a cheatsheet) — the tip line lists J/K/R// but a discoverable overlay is better. | none | **DONE (2026-05-30), via a native `<details>` reference instead of a `?`-keypress modal.** DiffView renders an always-available, keyboard-accessible "Keyboard shortcuts" `<details>` (J/K, R, /). The `?`-keypress *modal* was deliberately NOT built: a modal needs a focus-trap + dismiss handling for marginal gain over a native, always-discoverable `<details>` that requires neither. (Reconciles a prior drift where this row read "Queued" while the summary said "implemented".) |
| N7 | **Multi-amendment timeline** (diff across a chain of amendments, not just two). | human (positioning proposal — this is the "team" scope direction) | BLOCKED on `APPROVALS.md` #1. |
| N8 | **Keyboard-accessible info popovers** — the Summary "Critical"/"Confidence" `title` tooltips are mouse-only; a real popover (focusable, `aria-describedby`) is the ship-grade version. | none (but pairs with the browser-gated contrast P2) | **DONE (2026-05-30).** Each stat is now `tabIndex=0` + `aria-describedby` -> a visually-hidden (`.sr-only`) description carrying the same text the mouse-only `title` had, so screen-reader AND keyboard users get the explanation. 2 a11y regression tests. (The *contrast* check remains correctly browser-gated; this closes the focusable/describedby half.) |
| N9 | **Critical-first surfacing** — the store listing promises "critical changes flagged at the top," but the list is document-ordered (Product-Sense P3, `CRITIQUE_LOG.md` bug-hunt pass 8). Add a "Critical changes (N)" section at the top of `DiffView` (critical changes in document order) above the full list — makes the marketing true AND is a genuine deadline-pressure UX win. | none | **DONE (2026-05-30).** `criticalFirst` stably orders the default list critical-first (document order within each group), matching the export and making the store-listing claim literally true. Pure helper + 5 unit tests. |
| N10 | **detectMoney edge cases** (bug-hunt pass 13 probe, 2026-05-30): `"$.5M"` (no leading zero before the decimal) yields no MONEY anchor, and `"$1.5MM"` (finance double-M) reads as `$1`. **Low severity:** a money anchor only *boosts* a change toward PRICING/critical; a miss still surfaces as a normal text diff, so neither hides a change. Fix = widen `MONEY_RE` to allow a leading `.` and treat `MM`→million, with characterization tests first. | none | POLISH — deliberately NOT rushed on a Saturday-evening regex change without high confidence (per the 2026-05-30 "don't fix from a hunch" lesson). Verified-correct behaviors were locked as characterization tests (pass 13). Queued. |

Net: 8 of 9 are zero-cost/unblocked. N2 + N6 + N1 implemented this
session; N3, N8, N9 queued as POLISH; N5 noted; N4 dropped (self-audit);
N7 is the gated team-scope decision. "Done" remains provisional.

## After ship (forward look)

Once BidDiff passes the ship gate and the human completes the
store submission, it enters `STATUS: shipped` and immediately
gains the recurring obligations:

- Monthly full re-critique (5.7.1).
- Cycle-cadence "nothing is ever done" re-opening review (5.7.4).
- Weekly continuous bug-hunt with newly invented inputs (5.7.5).
- Continuous polish in the POLISH loop (PART 4.3).

A product is never finished. The bar is permanent.

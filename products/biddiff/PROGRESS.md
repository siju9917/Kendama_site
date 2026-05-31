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
| K2 | Ship-gate dry run against `governance/QUALITY_BAR.md`. Defend every item with cited evidence. Address findings. | **Dry run ran 2026-05-30** → `docs/ship-gate-dry-run.md`. Engineering bar defended on every axis. **All 3 unblocked hygiene gaps CLOSED** (security-audit re-confirm + `tar` override 11→7; current CHANGELOG; asserted bundle-size budget). Deep-hardening continuation: **455 tests** (from 226), full CI green; every exported core fn (directly or via a tested caller) + all trust/security boundaries + the corpus-audit harness + all user-facing claims now tested/verified; genuine fixes (suppress %/sign, corrupt-payload, markdown-backtick, telemetry PII, page-limit extraction, 2 doc-accuracy claims). | _no — does NOT pass, but the remaining blockers are all EXTERNAL: the human/cap-gated structural P1s (positioning `APPROVALS.md` #1; domain-expert validation + market research; the privacy/support-license copy A/B `NEED_FROM_HUMAN.md` #7) and the browser-gated a11y-contrast P2. The engineering bar itself is met with evidence. The only non-gated item is the non-shipping Vite/Vitest toolchain bump (maintenance). |
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
2. **Spelled-out page limits with parenthetical not matched. — ADDRESSED 2026-05-30.**
   `PAGE_LIMIT_RE` required the digit immediately after the lead phrase,
   so "shall not exceed ten (10) pages" — a very common federal phrasing —
   was missed. The regex now allows an optional `<word> (` before the digit
   and a `)` after, pulling the authoritative digit from the parenthetical
   ("ten (10)" -> 10), with no regression to the plain "30 pages" form.
   Pure extraction correctness (page-limit anchors feed classification by
   presence). 2 regression tests; corpus floors held. Bug-hunt pass 42.
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

5. **Deadline TIME / TIMEZONE changes with no date token are not flagged
   critical outside Section L. — OPEN (gated; criticality, not extraction).
   Found bug-hunt pass 63 (2026-05-31), Domain-Expert #5 lens.** For a
   capture manager a deadline moving from "2:00 PM Eastern" to "11:00 AM
   Eastern" (same date) or "Eastern" → "Central" is critical (miss it = miss
   the bid), but there is no TIME anchor, and the only signals that flag a
   deadline are a DATE anchor or a DATES_DEADLINES / SUBMISSION_INSTRUCTIONS
   category. Probe (4 cases, engine-level): a time-only change **in Section L
   (INSTRUCTIONS) IS flagged CRITICAL** via SUBMISSION_INSTRUCTIONS (reason is
   the generic "Submission instructions changed.", not "the deadline time
   changed"); but a time-only or timezone-only change **in an OTHER/untyped
   section is MISSED (severity NORMAL)**. Real-world frequency depends on where
   the due date/time sits — usually Section L or the SF-1449/SF-33 cover (block
   8). **Two candidate responses for BD2 to decide:** (a) add a `TIME` anchor +
   a deadline-time critical rule (risk: false positives on every "2:00 PM
   conference", duration "30 days", "business hours" — needs the domain
   expert to bound it); or (b) confirm that in practice the due date/time
   always co-occurs with a DATE token (so it is already caught) and the gap is
   theoretical. **NOT changed this cycle** — `critical.ts` is explicitly
   append-only-when-BD2-lands, and a deadline rule is precisely the kind of
   domain call that must not be made on a Saturday-evening hunch. Evidence
   recorded here so the post-validation cycle decides with specifics.

6. **Candidate structured-value anchors beyond the current six. — OPEN
   (gated ideation for BD2; first-principles, pass 63 follow-on, 2026-05-31).**
   The engine anchors six value types (CLAUSE_REF, DATE, MONEY, PAGE_LIMIT,
   CLIN, SECTION_REF). A first-principles enumeration of solicitation values
   whose *change* a capture manager must not miss surfaces candidates the
   anchor set does not capture — ranked by miss-cost:
   - **Submission destination (email / portal URL / physical address).**
     Highest miss-cost of all: if an amendment changes WHERE to submit, a
     bidder who misses it sends the proposal to the wrong place = automatic
     loss, arguably more catastrophic than a date slip. No EMAIL/URL anchor
     today; such a change is caught only if it lands in a typed INSTRUCTIONS
     section. Strong candidate for a dedicated anchor + critical rule.
   - **Deadline TIME / TIMEZONE** — see obs #5.
   - **Period / place of performance** ("12-month base + four option years";
     a PoP location change can flip a bid/no-bid). Today only flagged if in a
     typed section.
   - **Quantity / staffing minimums** ("not less than 5 FTE", "minimum 3 past
     performance references") — a tightened minimum can disqualify.
   - **Set-aside / size standard / NAICS** — a change here can change WHO is
     even eligible (overlaps the BD2 set-aside gap already noted above).
   These are **ideation, NOT a build list** — each new anchor risks false
   positives and must be bounded by the domain expert (NEED #4). Logged so the
   post-validation cycle weighs them against real practitioner priority rather
   than re-deriving the list. The submission-destination one is the strongest
   standalone case and worth raising first in the BD2 conversation.

7. **Money in currency-code / spelled-out notation not parsed. — OPEN
   (gated; low-severity extraction gap; found bug-hunt pass-76 follow-on,
   2026-05-31).** `detectMoney` only matches `$`-prefixed amounts. A 5-case
   probe: `$5,000,000` → parsed; but `USD 5,000,000`, `5,000,000 USD`,
   `USD 5M`, and `5 million dollars` all yield NO money anchor. Federal
   solicitations do use "USD" and "...dollars" notation. **Low severity** (same
   class as obs #1-3): the MONEY anchor feeds classification by *presence* only
   and merely *boosts* a change toward PRICING/critical — a miss still surfaces
   as a normal text diff, so no change is hidden. **NOT fixed on a hunch:**
   widening `MONEY_RE` to "USD"/"dollars" risks false positives ("5 USD per
   line item", "dollars" in prose) and money-regex changes are exactly where
   this session's bugs hid (suppress %/sign, the magnitude bug) — the lesson is
   to validate a money-regex widening against the corpus + real notation
   patterns (BD2), with characterization tests first, not rush it. Logged for
   the post-validation cycle.

8. **List RENUMBERING produces spurious (often CRITICAL) MODIFYs. — OPEN
   (NOT gated; a real diff-quality / false-positive concern; found bug-hunt
   pass-76 follow-on, 2026-05-31). The most significant noise finding of the
   late session.** Probe: a Section-L list `L.1/L.2/L.3` with ONE item inserted
   at position 2 produced **3 changes** — 1 correct INSERT (the new item) PLUS
   **2 spurious MODIFYs** (`L.2 Use 12-point font.`→`L.3 Use 12-point font.`,
   `L.3 …`→`L.4 …`) because the shifted number prefix is value-bearing text the
   suppressor won't drop. In Section L/M (INSTRUCTIONS) these spurious MODIFYs
   are even marked CRITICAL. A capture manager would see "3 critical changes"
   for a 1-item insertion — inflated count, degraded signal-to-noise (the core
   value prop). **Realism:** REAL for PDF (the primary federal input — pdf.js
   extracts the rendered number as text) and for manually-typed numbers; NOT a
   problem for DOCX **auto-numbered** lists (`<w:numPr>` — the number isn't in
   the run text, confirmed in `docxExtractor.ts`). **NOT fixed this cycle** —
   the fix is a non-trivial CORE-diff change (detect a "leading list-ordinal is
   the ONLY difference" between two otherwise-identical blocks, then suppress
   the renumber or group it as "renumbered, content unchanged"), and core-diff/
   suppression changes are exactly where this session's bugs hid; it must be
   designed + validated against REAL solicitations (must NOT hide a real content
   change that coincides with a renumber) with characterization tests first, not
   rushed on a Saturday-evening hunch. The DOCX `isList` flag could help for
   DOCX, but PDF needs a text-level leading-ordinal detector. High-value POLISH
   for a dedicated cycle.

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

## Ship sequence (the critical path) — consolidated 2026-05-31

The ship *mechanics* are already built (`scripts/package.sh` runs the full gate,
builds `dist/`, and writes `dist-zips/biddiff-v<version>.zip` + prints the
submission steps). What this section adds is the **ordered critical path** —
the gates that must clear, and in what order, BEFORE that package+submit step is
safe to run — so the cap/human-unblocked session (or the human) ships without
re-deriving it. F = factory can do autonomously; H = human-gated.

1. **[H] Decide positioning** (`APPROVALS.md` #1; auto-proceeds to "reposition"
   on 2026-06-03). Gates the listing copy's framing (individual vs team tool).
2. **[H] Resolve the server-claim copy** (`NEED_FROM_HUMAN.md` #7 — option A
   on-device-only recommended). Until this is decided, the privacy policy /
   store listing / **options page** / help / support copy overstate
   license/telemetry/OCR server flows v1 does not perform — a Web-Store-review +
   misrepresentation risk. **Hard blocker for submission.**
3. **[F] Apply the copy decision** across all surfaces once #2 is decided
   (`NEED #7` lists the exact files incl. `src/options/index.tsx`,
   `docs/privacy-policy.md`, `docs/store-listing.md`, help docs,
   `docs/support-macros.md`). The `docs-match-code` + `no-advisory-language`
   tests then re-confirm accuracy.
4. **[F] (optional) Wire the redline DOCX export button** after the human
   one-time Word-render check (`NEED #9`) — additive, not a submission blocker.
5. **[F] Publish the privacy policy** at a public URL (the listing needs the
   URL) — depends on the human's hosting/domain (a `NEED` item if not yet set).
6. **[F] Run `scripts/package.sh`** → produces the gate-verified zip. (Bump
   `manifest.config.ts` version if re-submitting.)
7. **[H] Submit**: upload the zip to the Web Store dev console, paste the
   listing + permission justifications from `docs/store-listing.md`, set the
   privacy-policy URL, submit for review (`NEED_FROM_HUMAN.md` #6).

**Critical path = 1 → 2 → 3 → 5 → 6 → 7.** Steps 1, 2, 5, 7 are human-gated;
everything else the factory does. The single hardest blocker is #2 (the copy
must match what v1 actually does before a reviewer sees it). Nothing here needs
the spend cap.

## "Nothing is ever done" review (5.7.4) — 2026-05-30

Mandated re-opening review: challenge the premise that BidDiff's
current state is as good as it gets. What would a top-tier team add?
These are **improvements** (not bugs — the bug-hunt is separate), each
tagged with its gate. Promising ones become POLISH/BUILD tasks.

| # | Improvement (what a top-tier team would add) | Gate | Disposition |
|---|---|---|---|
| N1 | **Try-it-without-files sample diff** — a "See an example" button that loads a bundled before/after so a first-run user reaches value with zero setup. | none | **DONE (corrected 2026-05-31 — the table had drifted to "Queued" while the feature was already shipped).** `src/core/sample/sampleDiff.ts` builds a small, realistic Section-L before/after through the REAL model + engine (genuine classification/criticality path, not a hand-mocked result); `useDiffPipeline.openSample()` loads it into a DONE state with an ephemeral "built-in example — not saved to your history" notice and never persists it; the empty state shows a "New here? See an example diff" button (App.tsx). Tests: `sampleDiff.test.ts` (builder) + a new `useDiffPipeline` openSample test (reaches a non-empty real diff, flagged ephemeral, never calls saveDiff). |
| N2 | **History row a11y** — the row is `role="button"` with a nested ✕ `<button>` (invalid interactive nesting). Refactor to sibling buttons (open + delete), no nesting. | none | **DOING NOW** — clear a11y fix, verifiable via History.test. |
| N3 | **Redline DOCX export** — capture teams live in Word; a redline `.docx` is what they'd attach to a review. Buildable with the existing JSZip dep (DOCX is a zip of OOXML) — **no new dependency**. | **human (visual verify)** | **GENERATOR DONE (2026-05-30), behind the gate.** Built `src/core/export/redlineDocx.ts` (existing JSZip dep; deletions struck+red, insertions underlined+green, critical-first, disclaimer) + 5 structural tests (valid OOXML round-tripping through the product DOCX walker; contains change text + disclaimer; XML-injection-safe). NOT wired to a UI button: per the gate a human opens one generated .docx in Word to confirm professional rendering first. Bundle-neutral (tree-shaken out until imported). Human step = NEED_FROM_HUMAN #9. |
| ~~N4~~ | ~~"What changed since I last viewed"~~ | — | **DROPPED (self-audit).** Ill-formed: a saved diff is static once computed, so there's nothing "new" within it on re-open. The only meaningful "what's new" signal is *which diffs* are unseen — already covered by the History unseen-dot. No work. |
| N5 | **Change-list virtualization** for pathological diffs (DiffView renders every card). Realistic amendments are <~150 changes (fine), but a defensive cap/windowing protects the tail. | none | POLISH (low priority at realistic scale) — note the Performance-critic "virtualize where needed"; revisit if a real >500-change diff appears. |
| N6 | **Keyboard-shortcut help overlay** (`?` opens a cheatsheet) — the tip line lists J/K/R// but a discoverable overlay is better. | none | **DONE (2026-05-30), via a native `<details>` reference instead of a `?`-keypress modal.** DiffView renders an always-available, keyboard-accessible "Keyboard shortcuts" `<details>` (J/K, R, /). The `?`-keypress *modal* was deliberately NOT built: a modal needs a focus-trap + dismiss handling for marginal gain over a native, always-discoverable `<details>` that requires neither. (Reconciles a prior drift where this row read "Queued" while the summary said "implemented".) |
| N7 | **Multi-amendment timeline** (diff across a chain of amendments, not just two). | human (positioning proposal — this is the "team" scope direction) | BLOCKED on `APPROVALS.md` #1. |
| N8 | **Keyboard-accessible info popovers** — the Summary "Critical"/"Confidence" `title` tooltips are mouse-only; a real popover (focusable, `aria-describedby`) is the ship-grade version. | none (but pairs with the browser-gated contrast P2) | **DONE (2026-05-30).** Each stat is now `tabIndex=0` + `aria-describedby` -> a visually-hidden (`.sr-only`) description carrying the same text the mouse-only `title` had, so screen-reader AND keyboard users get the explanation. 2 a11y regression tests. (The *contrast* check remains correctly browser-gated; this closes the focusable/describedby half.) |
| N9 | **Critical-first surfacing** — the store listing promises "critical changes flagged at the top," but the list is document-ordered (Product-Sense P3, `CRITIQUE_LOG.md` bug-hunt pass 8). Add a "Critical changes (N)" section at the top of `DiffView` (critical changes in document order) above the full list — makes the marketing true AND is a genuine deadline-pressure UX win. | none | **DONE (2026-05-30).** `criticalFirst` stably orders the default list critical-first (document order within each group), matching the export and making the store-listing claim literally true. Pure helper + 5 unit tests. |
| N10 | **detectMoney edge cases** (bug-hunt pass 13 probe, 2026-05-30): `"$.5M"` (no leading zero before the decimal) yields no MONEY anchor, and `"$1.5MM"` (finance double-M) reads as `$1`. **Low severity:** a money anchor only *boosts* a change toward PRICING/critical; a miss still surfaces as a normal text diff, so neither hides a change. Fix = widen `MONEY_RE` to allow a leading `.` and treat `MM`→million, with characterization tests first. | none | POLISH — deliberately NOT rushed on a Saturday-evening regex change without high confidence (per the 2026-05-30 "don't fix from a hunch" lesson). Verified-correct behaviors were locked as characterization tests (pass 13). Queued. |
| N11 | **Per-change "copy this change" affordance** — a capture manager triaging an amendment under deadline often pastes a single critical change into an email/Teams to a teammate ("did you see L.3 moved the due date?"). Today the only copy paths are the whole-diff text/markdown export. A per-`ChangeCard` "copy" button (plain + markdown) that includes the section heading, before/after, and the disclaimer line would match the real triage workflow. | none | **DONE (2026-05-30).** Per-`ChangeCard` Copy button -> `formatChangeForClipboard` (pure, tested): critical tag + section + reasons + before/after + clause + canonical disclaimer; clipboard write with graceful fallback + a "✓ Copied" confirmation. 3 tests. |
| N12 | **Empty-but-warned clarity** — when extraction produced warnings AND zero changes, the empty state already distinguishes "identical" from "extraction may be incomplete" (verified in DiffView). A top-tier touch: when confidence is low, surface a one-line, non-advisory "the source PDFs looked complex; consider re-checking against the originals" *as a reporting statement* tied to the existing confidence stat, not a new modal. | none | **DOWNGRADED (self-audit, 2026-05-30).** Already substantially delivered: the engine emits a low-confidence *warning* ("Extraction confidence is N% — lower than typical for clean text PDFs.", surfaced in the warnings list + exports), and the Confidence stat now explains the implication accessibly (post-N8). A new message would duplicate existing, non-advisory messaging. No work unless real usage shows the warning is missed. |
| N13 | **Section-anchored deep links within a diff** — for a long amendment, a "jump to section L / M / pricing" mini-nav above the change list (the section buckets already exist in the filter bar). Turns the existing `availableSections` data into one-click navigation, a real time-saver on a 200-change amendment. | none | **DOWNGRADED (self-audit, 2026-05-30).** The existing section *filter* bar already gives one-click access to any section's changes; a scroll-to mini-nav is a marginal scroll-vs-filter distinction, not a real new capability. Not worth building over the filter. Revisit only if a real >150-change diff shows the filter is insufficient (pairs with N5). |

Net: the unblocked items remain zero-cost. **Done:** N1, N2, N6, N8, N9, N11
(+ N10 characterized, two edge cases logged). **Downgraded** (the capability
already exists or the delta is marginal, verified by self-audit): N12, N13.
**Queued POLISH:** N3 (generator done; human-gated Word-render verify before
the button is wired — NEED #9), N5 (speculative virtualization), N10 (money
edge cases). **Gated:** N7 (positioning decision). N4 dropped. "Done" remains
provisional — the list grew this session rather than shrank, which is the
point of 5.7.4. (Reconciled 2026-05-31: the N1 row and this summary had
drifted — N1 was shipped but tabled as "Queued", and N11–N13 were mislabelled
"new/queued" when N11 was Done and N12/N13 Downgraded.)

## After ship (forward look)

Once BidDiff passes the ship gate and the human completes the
store submission, it enters `STATUS: shipped` and immediately
gains the recurring obligations:

- Monthly full re-critique (5.7.1).
- Cycle-cadence "nothing is ever done" re-opening review (5.7.4).
- Weekly continuous bug-hunt with newly invented inputs (5.7.5).
- Continuous polish in the POLISH loop (PART 4.3).

A product is never finished. The bar is permanent.

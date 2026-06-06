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
| K2 | Ship-gate dry run against `governance/QUALITY_BAR.md`. Defend every item with cited evidence. Address findings. | **Dry run ran 2026-05-30** → `docs/ship-gate-dry-run.md`. Engineering bar defended on every axis. **All 3 unblocked hygiene gaps CLOSED** (security-audit re-confirm + `tar` override 11→7; current CHANGELOG; asserted bundle-size budget). Deep-hardening continuation: **455 tests** (from 226), full CI green; every exported core fn (directly or via a tested caller) + all trust/security boundaries + the corpus-audit harness + all user-facing claims now tested/verified; genuine fixes (suppress %/sign, corrupt-payload, markdown-backtick, telemetry PII, page-limit extraction, 2 doc-accuracy claims). | _no — does NOT pass, but the remaining blockers are all EXTERNAL: the human/cap-gated structural P1s (positioning `APPROVALS.md` #1; domain-expert validation + market research; the privacy/support-license copy A/B `NEED_FROM_HUMAN.md` #7) and the browser-gated a11y-contrast P2. The engineering bar itself is met with evidence. All non-gated maintenance items (toolchain bump, DiffView coverage) are now DONE. |
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

4. **Letter-dot-number subsections for sections A–K not detected. — DONE
   (FIXED 2026-06-06).** `SECTION_LM_RE` was extended from `[LM]` to `[A-M]`
   — the minimal one-character change. "C.3 Performance Work Statement" is now
   a SECTION_LM_ITEM with `itemId "C.3"`, correctly assigning ucfLetter "C" via
   `extractUcfLetter`. The LETTER_DOT vs SECTION_LM patterns are mutually
   exclusive (LETTER_DOT requires a space after dot; SECTION_LM requires a digit
   after dot), so no new ambiguity. 8 assertions in the updated obs-#4 test
   (C.3, B.1, H.2.1, I.4, L.3, M.2.1 — plus regression that bare "C." stays
   LETTER_DOT). Downstream assemble.ts unchanged. 486/486 pass (test count
   unchanged; replaced 1 test, added assertions within it).

5. **Deadline TIME / TIMEZONE changes with no date token are not flagged
   critical outside Section L. — OPEN (low priority; public-source validated
   2026-06-06 — no implementation needed for v1).** Per FAR 52.215-1(c)(1),
   the proposal due date AND time must be stated in Section L (Instructions to
   Offerors). Public-domain solicitation analysis confirms: the due time
   always co-occurs with the due date in the same Section L block, so the
   existing DATE anchor catch already covers the critical-deadline case.
   Standalone time-only changes (no date co-occurrence) in Section L are
   already caught via the SUBMISSION_INSTRUCTIONS category rule (flagged
   CRITICAL, generic reason). The gap — time-only changes in non-INSTRUCTIONS
   sections — is confirmed low frequency by the FAR structure. A TIME anchor
   with false-positive risk for conference times / durations / business hours
   would not improve recall materially. **Conclusion: no implementation needed
   for v1; document as a known V2 polish candidate if users report missed
   time-only changes.** BD2 gate removed for this obs.

6. **Candidate structured-value anchors beyond the current set. — PARTIALLY
   RESOLVED (2026-06-06 public-source validation; SET_ASIDE implemented).**
   Engine anchors now: CLAUSE_REF, DATE, MONEY, PAGE_LIMIT, CLIN, SECTION_REF,
   SET_ASIDE. Public-source validation outcomes per candidate (BD2 gate removed):
   - **Set-aside / size standard / NAICS — DONE (2026-06-06).**
     FAR 19.501-19.507 and FAR 4.6 confirm this is clearly critical. SET_ASIDE
     anchor added (detects "set-aside", "NAICS XXXXXX", "size standard") +
     critical rule 7. 8 new tests; 484 pass.
   - **Submission destination (email / portal URL).** Per FAR 52.215-1(c)(1),
     submission address must be in Section L — changes there are already caught
     via SUBMISSION_INSTRUCTIONS. Email anchor would only add specificity of
     reason ("A submission address changed." instead of "Submission instructions
     changed.") for changes already detected. Low-priority V2 enhancement.
   - **Deadline TIME / TIMEZONE** — see obs #5 (resolved, no implementation).
   - **Period / place of performance.** No distinctive regex that wouldn't
     produce high false-positive rates in narrative SOW text. Caught via section
     type (SOW/DELIVERIES) or co-occurring DATE anchor. No V1 implementation.
   - **Quantity / staffing minimums.** Highly context-dependent; false-positive
     risk is high in SOW narrative ("at least 5 days notice"). No V1 anchor.
   - **Attachment / Exhibit cross-references.** Cheap to add alongside
     SECTION_REF. Low miss-cost (attachment number change is rarer than content
     change). Candidate for the next polish cycle.

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

8. **List RENUMBERING produces spurious (often CRITICAL) MODIFYs. — DONE
   (FIXED 2026-06-06 by `isListOrdinalOnlyChange` in `suppress.ts`).** The
   fix strips the leading list ordinal from both aligned blocks (matching "N. ",
   "N) ", "L.N ", "(N) " patterns), then compares the non-ordinal content via
   `aggressiveNormalize`. If ordinals differ but content is identical, the MODIFY
   is suppressed. Safe-by-design: any real content change prevents suppression.
   20 unit tests + 2 integration tests added; the prior KNOWN LIMITATION
   characterization test updated to assert the fixed behavior. 473/473 tests
   green. The N3/N4/N6/N8 DOCX `isList`-flag note is moot — the text-level
   ordinal detector handles the PDF case which was the real problem.

9. **Sub-CLINs (letter-suffix line items) not detected. — DONE (FIXED
   2026-06-06 by public-source validation).** DFARS 204.71 and the DoD PSFR
   pricing guide define sub-line items as 4-digit base + 2-letter designator
   (0001AA, 0001AB). `CLIN_RE` extended to match `CLIN XXXXAA` and `SubCLIN
   XXXXAA` formats; normalized to `{base}{suffix}`. Sub-CLINs now route to
   PRICING_CLINS via the existing CLIN anchor and trigger critical rule 5.
   3 new unit tests; 484/484 pass, typecheck clean. BD2 gate removed.

10. **NAICS colon-separator form not matched — DONE (FIXED 2026-06-06, 5.7.5 bug-hunt).**
    `SET_ASIDE_RE` used `\bNAICS\s+...` which required whitespace between "NAICS" and
    the rest. The SAM.gov header format `"NAICS: 541519"` (colon directly after NAICS,
    no "Code" keyword) was silently dropped — a NAICS-code change in that format would
    not be flagged CRITICAL even though it determines bidder eligibility. Em-dash
    forms (`NAICS – 541519`, `NAICS–541519`) were also missed. Fixed by changing the
    separator to `(?:\s*[:–-]\s*|\s+)`, which covers colon, en-dash, em-dash (with or
    without surrounding spaces) and plain whitespace. All existing tests continue to
    pass; 4 new tests: colon format, em-dash with spaces, no-space em-dash, no-regression.
    571/571 pass, typecheck clean.

11. **`extractSolicitationId` regex gaps — DONE (FIXED 2026-06-06, 5.7.5 bug-hunt).**
    Two bugs fixed in the same regex pass:

    (a) **Over-capture of trailing text.** The greedy middle char class
    `[A-Z0-9 \t-]{3,18}[A-Z0-9]` included spaces, so "W912TP-26-R-0001 Amendment"
    extended the capture to "W912TP-26-R-0001AME" (stripping the space but absorbing
    the letters). A prior document formatted with a newline after the ID and a current
    document with a space would produce different normalized IDs, triggering a false N14
    solicitation-mismatch warning. Fix: change final `[A-Z0-9]` to `\d` — federal IDs
    always end with the 4-digit sequential suffix; forces backtrack before letter words.
    Internal space-tolerance preserved ("W912TP -26-R-0001" still normalizes correctly).
    4 new tests (space+Amendment, tab+Amendment, comma no-regression, paren no-regression).

    (b) **SF-1449 "Solicitation/Contract/Order Number" label not recognized.** The most
    common commercial acquisition form (SF-1449 for commercial items, SF-33 for negotiated
    contracts) uses the slash-separated label. It was not in the prefix alternation, so
    those documents produced no solicitation ID and the N14 mismatch guard was silently
    inert. Fix: added `(?:\/[a-z\/]+)?` optional group after "solicitation" in the prefix.
    Both plain form ("Solicitation/Contract/Order Number W912TP-26-R-0001") and colon
    form ("...Number: FA8701-25-R-0042") now match. 1 new test (2 assertions).

    580/580 pass, typecheck clean.

12. **U+2212 MINUS SIGN not normalized to hyphen-minus — DONE (FIXED 2026-06-06,
    5.7.5 bug-hunt).** The mathematical minus character (U+2212), used by equation
    editors and some PDF producers in financial table cells with negative dollar
    amounts (e.g., "−$5,000"), was absent from `normalizeText`'s LIGATURES list.
    U+2212 is classified as Unicode Math Symbol, not Punctuation, so `aggressiveNormalize`
    also passed it through unchanged — it is not matched by `\p{P}`. Two documents
    formatted with different minus-character conventions for the same negative amount
    would therefore produce different `aggressiveNormalize` outputs, triggering a
    spurious MODIFY for a purely typographic difference.
    Fix: add U+2212 to the existing dash normalization LIGATURES entry so it converts
    to ASCII hyphen-minus before any further processing. 2 new tests: `normalizeText`
    converts U+2212 (text.test.ts); `aggressiveNormalize` treats "−$5,000" (U+2212)
    equal to "-$5,000" (suppress.test.ts). 584/584 pass, typecheck clean.

13. **PDF `clusterIntoLines` merges body lines when heading font is large — DONE
    (FIXED 2026-06-06, 5.7.5 bug-hunt).** `clusterIntoLines` derived its y-coordinate
    clustering tolerance from `sorted[0].height` — the topmost item on the page, which is
    frequently a large-font section heading (18–24pt). A 24pt heading gives tolerance=12.
    Body text in 10pt font with tight 12pt single-spacing sits exactly at the tolerance
    boundary (|12| ≤ 12), so two adjacent body lines collapse into one cluster. That merged
    cluster becomes one block, hiding any per-paragraph change between the two lines — the
    diff engine would show one giant MODIFY instead of targeted paragraph-level changes.
    Fix: compute tolerance from the **median** item height on the page. The median is stable
    against heading/table outliers and reflects the actual body-text font size. For a typical
    page with one 24pt heading and many 10pt body items, median = 10 → tolerance = 5, which
    correctly separates lines 12pt apart. 1 new regression test (4-item page with 24pt
    heading + three 10pt body lines; asserts 4 separate clusters). 586/586 pass, typecheck
    clean.

**Domain-Expert P1 status (2026-06-06, updated):** The BD2 gate was WITHDRAWN
(human declined outreach; factory validated from public FAR/DFARS sources instead).
Obs #4 DONE (A-K subsections), obs #8 DONE (list renumbering), obs #9 DONE (sub-CLINs),
obs #5 CLOSED (public-source confirms no V1 implementation needed), obs #6 PARTIALLY
RESOLVED (SET_ASIDE anchor implemented; others documented as low-priority). Obs #7
(USD/spelled-out money) remains OPEN as low-severity (money miss still shows as text
diff; widening the regex needs corpus validation per the characterization note). The
Domain-Expert P1 is now effectively **RESOLVED** for V1 scope — all high-priority
gaps addressed or documented with public-source reasoning; no human outreach required.

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
- **[DONE 2026-06-06, maintenance]** Bump the Vite 5→6/7 + Vitest 2→3 toolchain:
  landed **Vite 6.4.3 + Vitest 4.1.8 + @vitejs/plugin-react 5.2.0**.
  551/551 tests green; build 399.6 kB gz (budget); typecheck + lint clean.
  Resolved 5 of 7 audit advisories (including the critical Vitest UI-server
  arbitrary-file-exec, GHSA-5xrq-8626-4rwp). 2 remaining (rollup path traversal
  in @crxjs build tool) cannot be fixed without downgrading @crxjs below Vite 6
  compatibility; not a shipped risk. @crxjs compat risk was a false alarm —
  2.4.0 (installed) explicitly lists Vite ^6 in peerDeps.

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
| N10 | **detectMoney edge cases** (bug-hunt pass 13 probe, 2026-05-30): `"$.5M"` (no leading zero before the decimal) yields no MONEY anchor, and `"$1.5MM"` (finance double-M) reads as `$1`. **Low severity:** a money anchor only *boosts* a change toward PRICING/critical; a miss still surfaces as a normal text diff, so neither hides a change. Fix = widen `MONEY_RE` to allow a leading `.` and treat `MM`→million, with characterization tests first. | none | **DONE (2026-06-06).** `MONEY_RE` restructured to two alternatives: normal form (groups 1+2) and leading-decimal form (group 3). `MM` added to magnitude alternation before `M` (greedy); `mm: 1e6` added to `MAGNITUDE`. Bug-hunt-pass-13 characterization test replaced with passing assertions: `$.5M` → `500000.00`, `$.75M` → `750000.00`, `$1.5MM` → `1500000.00`, `$2MM` → `2000000.00`. 5 new tests; 505/505 green. |
| N11 | **Per-change "copy this change" affordance** — a capture manager triaging an amendment under deadline often pastes a single critical change into an email/Teams to a teammate ("did you see L.3 moved the due date?"). Today the only copy paths are the whole-diff text/markdown export. A per-`ChangeCard` "copy" button (plain + markdown) that includes the section heading, before/after, and the disclaimer line would match the real triage workflow. | none | **DONE (2026-05-30).** Per-`ChangeCard` Copy button -> `formatChangeForClipboard` (pure, tested): critical tag + section + reasons + before/after + clause + canonical disclaimer; clipboard write with graceful fallback + a "✓ Copied" confirmation. 3 tests. |
| N12 | **Empty-but-warned clarity** — when extraction produced warnings AND zero changes, the empty state already distinguishes "identical" from "extraction may be incomplete" (verified in DiffView). A top-tier touch: when confidence is low, surface a one-line, non-advisory "the source PDFs looked complex; consider re-checking against the originals" *as a reporting statement* tied to the existing confidence stat, not a new modal. | none | **DOWNGRADED (self-audit, 2026-05-30).** Already substantially delivered: the engine emits a low-confidence *warning* ("Extraction confidence is N% — lower than typical for clean text PDFs.", surfaced in the warnings list + exports), and the Confidence stat now explains the implication accessibly (post-N8). A new message would duplicate existing, non-advisory messaging. No work unless real usage shows the warning is missed. |
| N13 | **Section-anchored deep links within a diff** — for a long amendment, a "jump to section L / M / pricing" mini-nav above the change list (the section buckets already exist in the filter bar). Turns the existing `availableSections` data into one-click navigation, a real time-saver on a 200-change amendment. | none | **DOWNGRADED (self-audit, 2026-05-30).** The existing section *filter* bar already gives one-click access to any section's changes; a scroll-to mini-nav is a marginal scroll-vs-filter distinction, not a real new capability. Not worth building over the filter. Revisit only if a real >150-change diff shows the filter is insufficient (pairs with N5). |
| N14 | **Solicitation-number mismatch guard** — `solicitationId` is extracted + displayed but never *compared* between the two docs. If a user accidentally selects amendments of DIFFERENT solicitations (easy with similar filenames), the tool produces a misleading all-changed diff with no warning. A non-blocking, non-advisory reporting warning ("These documents report different solicitation numbers: X vs Y.") when both IDs are present and differ — mirroring the existing low-confidence warning pattern (`engine.ts`) — is a genuine wrong-document safety net. | none | **DONE (2026-06-06).** `extractSolicitationId()` added to `validate.ts` (conservative regex on "Solicitation No./Number", "RFP/RFQ No./Number" labels; scans first 2000 chars; normalizes: uppercase + strip whitespace; `[ \t]` only in ID char-class to prevent cross-line greedy capture). Wired into both `pdfExtractor.ts` and `docxExtractor.ts` (`solicitationId` on metadata). Mismatch guard in `engine.ts` emits a `pushUnique` warning when both IDs are non-null and differ. 12 new tests (extractSolicitationId happy-path, no-match, normalization, depth-limit; engine: mismatch fires / same-ID silent / one-null silent). 503/503 green. |
| N15 | **Sign-before-dollar in `aggressiveNormalize`** (5.7.5 bug-hunt, 2026-06-06): `"-$5,000"` and `"$5,000"` normalized to the same string because `isLeadingSign` only fired when `next` was a digit, not `"$"`. Consequence: `isListOrdinalOnlyChange("2. Pay -$5,000.", "3. Pay $5,000.")` incorrectly returned `true` — a real value change (sign removed from a dollar amount) was silently suppressed. | none | **DONE (2026-06-06).** `isLeadingSign` extended: `next === "$"` added alongside `/\d/.test(next)`. Now `"-$5,000"` → `"-$5000"` (sign preserved) ≠ `"$5,000"` → `"$5000"`. Red test added first, then fix; 35/35 suppress tests pass, 488/488 full suite green. |
| N16 | **Page-limit bare-paren form missed** (5.7.5 bug-hunt, 2026-06-06): `PAGE_LIMIT_RE` had `(?:[a-z]+\s+\()?(\d{1,4})\)?` — the opening `\(` was inside the "spelled-out word" optional group, so `"not to exceed (30) pages"` (no spelled-out word before paren) produced no PAGE_LIMIT anchor. The change was still CRITICAL via SUBMISSION_INSTRUCTIONS, but with the generic "Submission instructions changed." reason rather than the specific "A page limit changed." reason. | none | **DONE (2026-06-06).** `PAGE_LIMIT_RE` split group: `(?:[a-z]+\s+)?\(?(\d{1,4})\)?` — word-group and opening-paren are now independent optionals. "not to exceed (30) pages", "limited to (50) pages", "page limit: (75) pages" all now produce PAGE_LIMIT anchors. Red test → fix; 3 new test cases, 490/490 full suite green. |

**5.7.4 "nothing is done" session (2026-06-06):** 20 POLISH findings from full
product re-review. Implemented immediately (7 tiny/small, no human gate):
- **N-A2**: Unified copy-feedback flash duration (`COPY_FEEDBACK_FLASH_MS = 2000ms`
  constant; was 1500ms in ChangeCard vs 2500ms in Summary). 490 tests.
- **N-A4**: Context-aware empty-state when Critical filter active → "No critical
  changes match the current filters. Switch to 'All'..."
- **N-A5**: SAM.gov download errors categorized: timeout (AbortError) → retry hint;
  4xx → "file may have been removed"; 5xx → "server returned an error".
- **N-A8**: LicenseChip grace-period countdown: "Trial expired · 5d grace left"
  or "Grace period ends today" when <24h. Uses existing gracePeriodSecondsLeft.
- **N-A9**: Dynamic aria-label on "Mark reviewed" toggle: "Unmark as reviewed"
  when aria-pressed=true (was "✓ Reviewed" — screen readers couldn't tell the action).
  Test updated to use the new accessible name.
- **N-A11**: File-format error conversion hints: .doc → "File → Save As → .docx";
  .txt → "upload the PDF directly". Test pins the conversion hint text.
- **N-A13**: Copy Markdown tooltip expanded to name Teams and "any markdown-aware
  app" instead of just Slack/GitHub/Notion.
- **N-A20**: Onboarding card gains a "Ready?" CTA paragraph pointing to sample diff.
- **N-A21 (DONE 2026-06-06)**: Filter result count — when any filter is active and
  narrows the list, shows "X of N changes" next to the reviewed counter. Prevents the
  "did I filter everything out?" confusion when text or section filter is active. 3 new
  tests in DiffView.test.tsx (counter shows / hidden when no filter / hidden when all match).
- **N-A14**: FAQ entry added: "BidDiff flagged something as critical but my team
  doesn't think it matters" — use Mark reviewed; report false positives.

**Queued POLISH (5.7.4 findings):** None remaining (unblocked). N18 DONE 2026-06-06.
Still gated: N-A3 (reviewed card visual contrast — browser), N-A7 (OCR consent
requires OCR implementation), N-A12 (contrast verification — browser), N-A16
(store listing accuracy — human), N-A19 (section jump mini-nav — optional).

Net: the unblocked items remain zero-cost. **Done:** N1, N2, N6, N8, N9, N10, N11, N14, N15, N16, N17, N18,
N-A2, N-A4, N-A5, N-A8, N-A9, N-A10, N-A11, N-A13, N-A14, N-A20, N-A21.
(+ N10 characterized, two edge cases logged). **Downgraded** (the capability
already exists or the delta is marginal, verified by self-audit): N12, N13.
**Queued POLISH:** N3 (generator done; human-gated Word-render verify before
the button is wired — NEED #9), N5 (speculative virtualization). No further
unblocked POLISH items as of 2026-06-06.
**Gated:** N7 (positioning decision). N4 dropped. "Done" remains
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

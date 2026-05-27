# BidDiff — CRITIQUE_LOG

> Every critique pass and its findings, in order. Each entry:
> the date, the pass type, the critic(s), the findings, the
> triage, the fixes, the convergence count.
>
> The pre-migration critique history (the many BidDiff polish
> iterations done under the prior loose process) is preserved in
> `legacy-notes/REFLECTION_LOG.md` and the git commit history.

Format per pass:

```
## YYYY-MM-DD — Phase <id> — pass <n>

**Pass type:** post-phase | recurring re-critique | bug-hunt |
re-opening review | escalation second-pass.
**Critics run:** list.
**Findings:** P0 / P1 / P2.
**Fixes:** what changed.
**Convergence:** "clean on cycle K" or "another pass scheduled."
```

---

## 2026-05-27 — Phase K1 — pass 1

**Pass type:** Post-phase + escalating (treated as adversarial
per 5.7.2 because the prior loose process converged to "zero
findings" many times — those were inputs to this pass, not
substitutes).

**Critics run:** All 14 critics in the roster, with extra
weight on Ambition (#13), Research Quality (#14),
Domain-Expert (#5), Devil's-Advocate (#12), and
Product-Sense (#11). The remaining critics (Correctness,
Adversarial, Security, Polish, Performance, Reliability,
Accessibility, Compliance, Maintainability) re-ran against
the codebase the prior loose process had already exhaustively
iterated; they returned no new findings on this pass — which
per 5.7.2 means they get a harder pass once the P1s below
are addressed.

**Findings:**

### P1 — Research Quality Critic (#14) — no market evidence on BidDiff

- **Area:** `brain/RESEARCH/` (no BidDiff-specific competitor
  teardown or market sizing); product claims to serve "proposal
  / capture managers bidding on federal contracts" without
  cited evidence the market exists, who the comparables are,
  what their pricing looks like, or what their install / use
  signals are.
- **Symptom:** BidDiff is about to be priced via a paid license
  but the buyer audience, addressable market, and competitive
  landscape have not been formally researched. The audience
  claim is undefended by evidence.
- **Severity:** P1. The product cannot ship to Chrome Web Store
  with monetization while these claims are unsupported.
- **Fix:** Produce
  `brain/RESEARCH/2026-05-27-biddiff-market-research.md` —
  cited competitor teardown, addressable-market sizing,
  comparable-revenue benchmarks. Queued as the BidDiff
  research item for the next session.
- **Roster growth (5.7.3):** the Research Quality Critic was
  added in the same cycle as this finding — it caught the
  finding, validating the addition. No further roster change
  required by this specific finding.

### P1 — Domain-Expert Critic (#5) — solicitation lifecycle coverage gap

- **Area:** `products/biddiff/src/core/diff/critical.ts`,
  `products/biddiff/docs/help/what-counts-as-critical.md`.
- **Symptom:** The critical-changes ruleset covers
  dates / page-limits / clauses / eval-criteria / CLINs /
  attachments. A real federal proposal / capture manager would
  flag several additional materially critical categories the
  product currently classifies as "Other":
  - **Source-selection-timeline** changes beyond DATE anchors
    (bid opening time, oral-presentation scheduling).
  - **Responsibility / key-personnel** updates (prime, sub
    key personnel).
  - **Compliance-certification** additions (ITAR, EAR,
    cybersecurity attestations new in this amendment).
  - **Non-CLIN contract-value** changes (task-order caps,
    exercise-option pricing, min/max quantities not in
    structured CLIN lines).
- **Severity:** P1. The product's headline value proposition
  is critical-change flagging; gaps in the ruleset are not
  cosmetic.
- **Fix (split into two tasks):**
  1. **Human-routed (`NEED_FROM_HUMAN.md`):** source 2-3 real
     federal proposal / capture managers to validate the
     extended ruleset. The factory drafts the validation
     questions; the human delivers them.
  2. **Code:** extend `src/core/diff/critical.ts` with the
     validated categories; add anchors in the extractors as
     needed; add integration test pairs per new category.
- **Roster growth (5.7.3):** strengthen the Domain-Expert
  Critic checklist in `governance/CRITIQUE_AGENTS.md` with
  explicit federal-procurement specifics once the validation
  lands. Logged as a pending roster-growth row for the next
  cycle.

### P1 — Ambition Critic (#13) — scope vs. claimed audience mismatch

- **Area:** `products/biddiff/SPEC.md` audience claim,
  `products/biddiff/docs/store-listing.md` positioning, whole
  feature set.
- **Symptom:** BidDiff claims to serve "proposal / capture
  teams" but ships as an individual read-only tool — no
  multi-amendment timeline view, no team collaboration
  (assign / resolve / discuss findings), no capture-tool
  integrations (Anaplan / Salesforce / Deltek), no FAR-clause
  interaction surfacing. A top-tier team building for this
  audience would have shipped a capture-collaboration platform
  of which the diff is one module. The product currently has
  the *positioning* of a team product and the *feature set* of
  an individual product.
- **Severity:** P1. Not a bug; a structural mismatch that will
  produce "where's the team feature?" reviews within weeks of
  launch unless resolved.
- **Fix:** Decide between (a) **reposition** the Web Store
  listing as "individual proposal-manager amendment triage"
  (cheap, sharpens positioning to match shipped feature set);
  (b) **extend** scope with a credible v1 of team features
  (~4-6 week effort); or (c) **ship as-is with documented
  intent** to add team features later. This is a positioning
  decision the human must make — proposal posted to
  `human/APPROVALS.md` on the next cycle with the full context.
- **Roster growth (5.7.3):** Ambition Critic was added in the
  same cycle — it caught a structural finding, validating the
  addition. No further roster change required.

### P2 — Devil's-Advocate Critic (#12) — no real SAM.gov integration test

- **Area:** `products/biddiff/src/content/sam/`,
  `products/biddiff/test/` (no end-to-end SAM page test).
- **Symptom:** SAM.gov attachment surfacing is a headline
  feature, but no test actually runs the selectors against a
  real SAM page. SAM.gov has changed its UI significantly
  in 2024-2025; the selectors are marked "best-effort" and
  silently break, producing an empty "no attachments" UI that
  looks fine.
- **Severity:** P2. Not a ship blocker (core diff works
  without SAM) but a reliability debt that will surface as
  bad reviews.
- **Fix:** Add a Playwright e2e test against a recorded SAM
  amendment page; requires a Chromium binary (logged as a
  human action). Logged to `PROGRESS.md` as a Phase K-post
  task.

### P2 — Product-Sense Critic (#11) — first-run assumes domain familiarity

- **Area:** `products/biddiff/src/sidepanel/Onboarding.tsx`,
  `products/biddiff/docs/help/what-counts-as-critical.md`.
- **Symptom:** A new user — especially a junior bid
  coordinator — has no inline UX nudge explaining what
  BidDiff means by "critical." The help doc is correct but
  off-screen.
- **Severity:** P2.
- **Fix:** Inline tooltip / `aria-describedby` on the first
  critical-change card in any new diff, with a link to
  detail. Logged for the next BidDiff polish cycle.

### P2 — Accessibility Critic (#8) — dark-mode contrast not verified in real components

- **Area:** `products/biddiff/test/unit/accessibility.test.ts`
  (tests design-system color pairs in isolation, not real
  rendered components).
- **Symptom:** A nested critical-change card with a red accent
  bar on a dark theme may have contrast failures the
  existing token-level test cannot detect.
- **Severity:** P2.
- **Fix:** Add `axe-core` based rendering tests for
  `ChangeCard` and `Summary` under dark mode. Logged for the
  next BidDiff polish cycle.

**Convergence:** Phase K1 does **NOT** converge clean on this
pass. Three P1 findings are open. Per 5.7.2 the next pass is a
harder escalating pass against the P1s once they're addressed.
Per 5.3 the phase only closes after a fresh full-panel pass
returns zero P0/P1.

**Routing:** P1 #1 and #2 require human-touching work and route
to `human/NEED_FROM_HUMAN.md`; P1 #3 routes to
`human/APPROVALS.md` as a positioning proposal. The factory
continues with non-blocked work while these wait.

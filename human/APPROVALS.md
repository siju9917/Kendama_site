# APPROVALS.md — the fast veto gate

> When the decision engine promotes an idea to "ready to build,"
> it posts the proposal here: the idea, its deep evaluation
> summary, its score, and the reasoning. The human's job is a
> fast **yes / no / redirect**.
>
> To keep the factory from stalling: each proposal has an
> auto-proceed window. If the human does not respond within the
> window, the factory proceeds. **The gate exists for the human to
> *catch* a bad call, not to *make* the call.** Minutes per week,
> not hours.

## Auto-proceed window

**Default:** 7 days from the date the proposal was posted.

The window is per-proposal and can be edited in the proposal body
itself. A proposal whose window is shorter than 7 days must
justify the shorter window in the body.

## Response format

To respond, edit the proposal's "**Status:**" line:

- `Status: APPROVED on YYYY-MM-DD by human` — the factory begins
  building on the next cycle.
- `Status: REJECTED on YYYY-MM-DD by human, reason: <why>` — the
  factory removes the idea from the active candidate set and
  logs the reasoning in `brain/DECISIONS.md`.
- `Status: REDIRECT on YYYY-MM-DD by human, redirect: <new
  direction>` — the factory revises the proposal per the
  redirect and re-posts.

---

## Open proposals

### Proposal #1 — BidDiff positioning decision

- **Posted:** 2026-05-27
- **Auto-proceed window:** 7 days from posting (defaults to
  **REPOSITION** if no response by 2026-06-03)
- **Status:** AUTO-PROCEEDED on 2026-06-06 (window elapsed 2026-06-03 with no human response) — applying REPOSITION default: BidDiff repositions to "individual proposal-manager amendment triage" per option A.
- **Source finding:** Ambition Critic (#13) finding in
  `products/biddiff/CRITIQUE_LOG.md` (Phase K1, pass 1)
- **Why a proposal and not an autonomous decision:** the
  choice changes what the product *is*, not just what's in
  it. The factory does not have the authority to make a
  positioning call this material without confirmation.

**The question:**

BidDiff currently positions itself as a tool for "proposal /
capture teams." Its actual feature set is an **individual**
read-only diff tool. There is no multi-amendment timeline, no
team collaboration (assign / resolve / discuss findings), no
capture-tool integrations, no FAR-clause interaction surfacing.
A real capture team would feel the gap within the first few
sessions of use.

You have three options:

**A. Reposition** (recommended default; the auto-proceed
lands here)

- Change the Web Store listing, in-app subtitle, and
  marketing positioning to "Individual proposal-manager
  amendment triage."
- Pros: cheap (~1 cycle of polish work); honest; sharpens the
  buyer audience to one BidDiff actually serves well.
- Cons: surrenders the (larger but unserved) team-tool market
  to potential future competitors.

**B. Extend the scope to genuinely serve teams**

- Add: multi-amendment timeline view; team collaboration
  (assign, mark resolved, comment); at least one capture-tool
  integration stub (Salesforce or Anaplan).
- Estimated effort: 4-6 BUILD cycles (cycle = one Saturday).
- Pros: matches the larger market; aligns positioning with
  product.
- Cons: significant delay to ship; demand for these features
  has not been validated (the Research Quality finding is
  open separately); risk of building unwanted features.

**C. Ship as-is with documented intent**

- Ship the individual-tool feature set under the current
  positioning, with explicit roadmap text in the listing
  stating that team features are planned.
- Pros: fastest ship.
- Cons: highest review-risk option. The factory's quality
  bar treats negative review momentum as a real risk; this
  is the least-defensible of the three.

**Your response format:**

Edit the `Status:` line above with one of:

- `Status: APPROVED on YYYY-MM-DD by human — option A (reposition)`
- `Status: APPROVED on YYYY-MM-DD by human — option B (extend scope; willing to wait 4-6 cycles)`
- `Status: APPROVED on YYYY-MM-DD by human — option C (ship as-is with roadmap)`
- `Status: REDIRECT on YYYY-MM-DD by human — <other option in your own words>`

---

## Closed proposals (audit trail)

### Proposal #1 — BidDiff positioning decision (AUTO-PROCEEDED 2026-06-06)

Window elapsed 2026-06-03 with no human response. Factory applied option A
(REPOSITION to "individual proposal-manager amendment triage"). See
`human/NEED_FROM_HUMAN.md` item 3 for the full list of copy changes applied.

---

## Working notes

- The factory **does not edit prior proposals' status lines** —
  only the human does. (The factory may append further analysis
  to a proposal body in response to a redirect.)
- A proposal that auto-proceeds (window elapsed without response)
  has its status updated by the factory to `Status: AUTO-PROCEEDED
  on YYYY-MM-DD (window elapsed)` so the audit trail is clean.
- A proposal must include: the idea name, evidence tier, total
  score, sub-scores, the deep evaluation summary, links to the
  deep evaluation file under `brain/RESEARCH/`, and the
  auto-proceed deadline.

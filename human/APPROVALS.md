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

_(none — the first proposal will be posted after the factory's
first deep evaluation, on the session after bootstrap)_

---

## Closed proposals (audit trail)

_(none yet)_

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

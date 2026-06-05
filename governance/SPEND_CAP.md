# SPEND_CAP.md — the hard budget limit and current spend

The factory stops cleanly when the cap is reached. This is the
safety valve against an autonomous agent spending unboundedly.

---

## Current cap

| Field | Value |
|---|---|
| Monthly cap (USD) | **$0 committed external spend** (policy set by human 2026-06-01) |
| One-time signup/registration fees | **Pre-approved up to $5 each** (e.g. the Chrome Web Store $5 dev registration) |
| Period | Calendar month, UTC |
| Spent this period | $0.00 |
| Last reset | (none yet) |
| Last reading taken | (none yet) |

## Spend policy (set by the human 2026-06-01 — supersedes the old "NOT SET" block)

The human has set the budget as a **policy, not a dollar figure**:

> "I don't really want to spend money. $5 to sign up here or there is
> ok, but I don't want operating expenses."

This resolves the old "human must set a cap" blocker. The operative rules:

1. **$0 committed monthly/recurring external budget.** The factory must NOT
   sign the human up for any paid subscription, metered external API, cloud
   server, or any recurring bill. Ever. Doing so requires a fresh
   `human/APPROVALS.md` entry.
2. **One-time signup/registration fees ≤ $5 each are pre-approved** (a
   marketplace developer registration is the canonical case). Anything above
   $5, or any recurring fee of any size, needs human approval first.
3. **The factory is NOT blocked from working.** It operates within the tools
   **already included in the operator's AI coding agent plan** — including web
   research and sub-agents — because those are covered by the existing
   subscription, NOT new committed spend. The old "unset cap ⇒ block research /
   sub-agents" rule no longer applies; the cap is now SET (to this policy).
   *(Assumption flagged for the human: this treats plan-included usage as
   "not an operating expense." If your plan is usage-metered and you'd rather
   the factory minimize even that, say so and it will switch to a
   no-paid-research, minimal-fan-out mode.)*
4. **Every PRODUCT the factory builds must be zero-marginal-cost** — see the
   hard filter in `governance/PRODUCT_CONSTRAINTS.md`. No product may require
   the human (or end users routed through the human) to pay for servers, APIs,
   storage, or any per-use cost. On-device / static / client-side only.

This means the spend cap is no longer a bottleneck: the bottleneck is now
**product DESIGN** (must be zero-opex) and **distribution** (must be
zero-touch), both encoded in `governance/PRODUCT_CONSTRAINTS.md`.

---

## How the cap is enforced

The cap is now SET to the **$0-committed-external-spend policy** above. The
factory enforces it by:

1. **Using plan-included tools freely** (web research, sub-agents, generation) —
   these are covered by the operator's existing AI coding agent subscription and are
   NOT committed external spend, so they are NOT blocked.
2. **Refusing any external committed cost.** Before signing up for, enabling, or
   depending on any paid external service, the factory checks: is it a one-time
   fee ≤ $5? If yes, proceed (pre-approved). If it is recurring, or > $5, or a
   per-use metered cost, the operation is **blocked** and logged to
   `human/APPROVALS.md` as a new approval request — the factory does NOT incur
   it and continues with other work.
3. **Refusing to design products with marginal cost** (see
   `governance/PRODUCT_CONSTRAINTS.md`) — a product that would need a paid
   server/API to run is rejected at the idea-filter stage, before any build.

The factory updates the spent-this-period value as accurately as
possible after each operation, based on observable usage. (Where
the platform provides a usage API the factory polls it; where it
does not, the factory conservatively estimates and rounds up.)

## How the cap is changed

Raising the cap is a **one-line edit** to this file by the human.
Lowering the cap is the same.

Per `governance/GUARDRAILS.md`, the factory may **not** raise the
cap itself. Raising the cap is one of the explicit
human-approval-required actions in PART 11.3.

## Period reset

At the start of each calendar month (UTC), the factory:

1. Reads the spent-this-period value.
2. Logs it to `brain/META_LESSONS.md` as the monthly burn.
3. Resets the spent-this-period value to $0.00.
4. Updates the "Last reset" timestamp above.

## Session ending due to the cap

When the cap ends a session, the session-ending sequence is:

1. Commit and push every unit of work in flight.
2. Update `brain/STATE.md` to state the exact next action.
3. Write `human/WEEKLY_DIGEST.md` if Saturday.
4. Append to `brain/META_LESSONS.md`: "session ended at cap; how
   close were we to a real productivity ceiling vs. waste?"
5. Exit.

A cap-ended session is **not a failure** — it is the safety valve
working. But repeated cap-ended sessions in a row suggest either
the cap is too low for productive work or the factory is being
inefficient. Either becomes a META-loop task.

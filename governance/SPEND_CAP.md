# SPEND_CAP.md — the hard budget limit and current spend

The factory stops cleanly when the cap is reached. This is the
safety valve against an autonomous agent spending unboundedly.

---

## Current cap

| Field | Value |
|---|---|
| Monthly cap (USD) | **NOT SET — human must set** |
| Period | Calendar month, UTC |
| Spent this period | $0.00 |
| Last reset | (none yet) |
| Last reading taken | (none yet) |

**Human action required:** edit the "Monthly cap (USD)" cell above
to the desired monthly budget for API and cloud cost. Until set,
the factory treats the cap as effectively zero and will only do
work that does not consume budget (planning, brain consolidation,
critique passes that do not spawn sub-agents). See
`human/NEED_FROM_HUMAN.md`.

---

## How the cap is enforced

Before any expensive operation — sub-agent spawn, large
generation, network research — the factory:

1. Reads the current spent-this-period value above.
2. Estimates the cost of the operation conservatively.
3. If estimated cost + already spent exceeds the cap, the
   operation does not run. The session ends cleanly with a
   full brain checkpoint and a note in
   `human/WEEKLY_DIGEST.md` that the cap was the binding limit.

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

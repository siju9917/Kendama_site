# NEED_FROM_HUMAN.md — the action queue

> The entire list of concrete actions only the human can take.
> Each item is self-contained: the human can do it without
> thinking, just following the steps.
>
> The factory **does not block on these items.** It logs the
> blocker here, stubs around it, and continues with all other
> work.

Order: highest priority first. The Sunday/Monday check-in
(`human/HOW_TO_USE.md` Section 7.6) walks the human through this
list.

---

## 1. **[OPEN]** Set the monthly spend cap

**Why:** Without a cap set, the factory cannot run expensive
operations (sub-agents, large generations, network research). It
can still do planning, brain consolidation, and code work that
does not call APIs — but capacity is severely limited.

**Steps (under 1 minute):**

1. Open `governance/SPEND_CAP.md` in this repository.
2. Find the row `Monthly cap (USD) | **NOT SET — human must set**`.
3. Replace `**NOT SET — human must set**` with the desired
   monthly budget in USD (for example, `$200`).
4. Commit and push the change.

**Suggested starting value:** $100–$300/mo while the factory is
new. The weekly digest reports actual burn so the value can be
tuned.

**Effect once done:** The next Saturday session can spend up to
the cap on building, critiquing, and researching.

---

## 2. **[OPEN]** Create the weekly Claude Code Routine (the Saturday trigger)

**Why:** Without the Routine, the factory only runs when the
human manually opens a Claude Code session. The Routine is what
makes Kendama wake every Saturday on Anthropic's cloud, with no
machine left on, with no human action.

**Time needed:** ~5 minutes, one-time.

**Steps:**

See `ops/SCHEDULE_SETUP.md` in this repository — it is the
self-contained walkthrough. The summary:

1. Confirm the account has a plan that includes Claude Code
   Routines (verify at `claude.ai/code/routines`).
2. Go to `claude.ai/code/routines`, click **New Routine**.
3. Select this repository (`Kendama_site`) as the routine's
   repository.
4. Set the trigger to **Scheduled**, cadence **weekly**, on
   **Saturday** at the chosen hour. **Do NOT select the
   GitHub-event trigger type — that one is prohibited by
   `governance/GUARDRAILS.md` #1.**
5. Paste the prompt body from `ops/SCHEDULE_SETUP.md` (it is
   a single self-contained instruction that says "Read
   `CLAUDE.md` and run the operating loop until the spend cap
   or the session limit is reached").
6. Click **Create**, then **Run now** once to verify the
   factory wakes and reads its brain correctly.

**Effect once done:** Kendama runs every Saturday on Anthropic's
cloud without further action.

**Fallback (only if Routines is not on your plan):** a local OS
scheduled job. `ops/SCHEDULE_SETUP.md` documents both paths and
`ops/run-kendama.sh` is the launch script for the cron path. The
cron path requires the human's machine to be powered on at the
scheduled time, which is the weakness Routines exists to
eliminate; prefer Routines.

---

## 3. **[OPEN]** Review the first approval proposal (when posted)

**Why:** Per PART 7.2, the human retains a fast veto on what gets
built. The factory has not yet posted a proposal — it will after
the first deep evaluation lands in `brain/RESEARCH/`. When the
proposal exists, this row in this file updates with a link.

**Time needed:** ~5 minutes per proposal.

**Steps:**

When the row updates, open `human/APPROVALS.md` and respond
**yes / no / redirect** on the proposal. If you do not respond,
the configured auto-proceed window applies and the factory
proceeds on its own (default 7 days).

---

## 4. **[OPEN]** (When BidDiff is ship-gate ready) Chrome Web Store submission

**Why:** Per PART 7.1 and `governance/GUARDRAILS.md` #5 and #11,
the human is the one who submits to live marketplaces. BidDiff
is not yet at the ship gate. When it is, the factory updates
this row with the exact submission steps and the artifact path.

**Effect once done:** BidDiff goes from `STATUS: shipped` (the
factory's internal gate) to actually live in the store.

---

## How items move out of this list

The factory **never deletes** entries here. When an item is done,
its status changes from `**[OPEN]**` to `**[DONE on YYYY-MM-DD]**`
and a brief note is appended. This preserves the audit trail of
what the human has done.

## How items are added

The factory adds an entry whenever a guardrail-protected action
is encountered (account, payment, legal, submission) or whenever
the spec calls for a human-only step. The Sunday/Monday check-in
walks the human through new entries.

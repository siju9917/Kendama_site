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

## 3. **[OPEN]** Review the BidDiff positioning proposal in `APPROVALS.md`

**Why:** The first formal Kendama critique panel pass on BidDiff
surfaced an Ambition Critic finding: the product's positioning
("capture teams") doesn't match its individual-tool feature set.
The factory has posted a proposal to `human/APPROVALS.md`
asking you to choose between **reposition / extend scope /
ship-as-is with documented intent**. Without your call, BidDiff
cannot reach the ship gate.

**Time needed:** ~5-10 minutes.

**Steps:**

1. Open `human/APPROVALS.md`.
2. Read the BidDiff positioning proposal at the top.
3. Edit the proposal's `Status:` line per the format in that
   file — `APPROVED` / `REJECTED` / `REDIRECT` with a reason.

Auto-proceed window: 7 days. Without a response, the factory
defaults to the *reposition* option (the safest of the three —
no multi-week scope commitment based on an agent's self-grade)
and continues toward ship.

---

## 4. **[OPEN]** Source 2-3 federal proposal/capture managers for domain validation

**Why:** The Domain-Expert Critic finding on BidDiff says the
critical-changes ruleset misses several materially critical
categories real practitioners would flag (source-selection-
timeline beyond pure dates; responsibility/key-personnel
updates; compliance certifications like ITAR/EAR/cyber; non-CLIN
contract-value changes). The factory cannot validate these
against pattern alone — it needs practitioner input.

**Time needed:** ~30-45 minutes of outreach over a week or
two; the conversations themselves are short (10 minutes each).

**Steps:**

1. Identify 2-3 people in your network: federal proposal
   manager, federal capture manager, federal contracts
   officer, or a consultant who routinely reads federal
   solicitations.
2. The factory drafts a short validation questionnaire on the
   next session (under 10 questions). Forward it to your
   contacts.
3. Paste the (anonymized if needed) responses into
   `products/biddiff/docs/domain-validation/` as
   `respondent-1.md` etc. The next session ingests them and
   updates `src/core/diff/critical.ts` accordingly.

**Effect once done:** Unblocks the BidDiff K1 Domain-Expert P1
finding. The ship gate becomes reachable.

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

# SCHEDULE_SETUP.md — one-time setup of the Saturday Routine

> **What this is:** the one-time instructions the human follows
> at `claude.ai/code/routines` to create the weekly trigger that
> wakes Kendama every Saturday. After this setup, Kendama runs
> on Anthropic's cloud with no machine left on, no manual
> launch, no further action.

This setup is one of the items in `human/NEED_FROM_HUMAN.md`. It
takes about five minutes.

> **Note on agent-neutrality:** the factory's operating logic is
> agent-neutral — any capable AI coding agent (or a human) can run
> the loop. *Scheduling*, however, relies on one supported runner:
> the Claude Code Routine (the scheduled trigger described below).
> The runner-specific details in this file (the Routine, the
> `.claude/settings.json` Stop hook, the auto-read `CLAUDE.md`) are
> what make the unattended Saturday cadence work; the rest of the
> factory does not depend on them.

---

## Why Claude Code Routines (and not anything else)

- Runs on Anthropic's managed cloud — **your machine does not
  need to be powered on Saturday.**
- First-party Anthropic feature — satisfies the
  `governance/GUARDRAILS.md` #1 prohibition on GitHub Actions
  and all CI-based schedulers.
- Setup is a one-time, no-code action in a web UI.

## What is prohibited

- **GitHub Actions / `.github/workflows/`** — forever, no
  exception. (`governance/GUARDRAILS.md` #1.)
- **The GitHub-event trigger type on a Routine.** Routines
  support a GitHub-event trigger as well; Kendama uses ONLY the
  **scheduled** trigger type. (`governance/GUARDRAILS.md` #1.)
- **Third-party CI schedulers** — CircleCI, Travis, Jenkins,
  GitLab CI, Buildkite, cron-as-a-service. (`governance/GUARDRAILS.md`
  #2.)
- **Multiple parallel Routines that would exceed the plan's
  daily-run allowance.** Adding a second cadence (e.g. a short
  midweek research-only run) is permitted only if it fits the
  plan's allowance — verify the current per-plan daily run
  limit before doing so.

---

## Step-by-step (human action)

### 1. Confirm the plan includes Routines

Routines is a paid feature on Anthropic's Claude Code, available
on plans that include "Claude Code on the web." At the time of
writing, the paid Pro, Max, Team, and Enterprise plans include
it — **but this is evolving.** Verify at the URL below before
creating the routine; if your plan does not include Routines,
follow the fallback in the "Fallback" section at the bottom of
this file.

URL: `https://claude.ai/code/routines`

### 2. Create the routine

1. Go to `https://claude.ai/code/routines`.
2. Click **New Routine**.
3. **Repository:** select this repository (`Kendama_site` on
   GitHub).
4. **Trigger type:** **Scheduled.** (Do NOT select the
   GitHub-event trigger type — that one is explicitly prohibited
   per `governance/GUARDRAILS.md` #1.)
5. **Cadence:** **Weekly**, on **Saturday**, at the hour you
   prefer. Pick an hour that gives the run the longest
   uninterrupted window on Anthropic's cloud — first thing UTC
   morning is a safe default unless you have a reason otherwise.
6. **Branch:** the routine reads from this repository's `main`
   branch (the canonical Kendama branch). If the routine UI asks
   for a branch, pick `main`.
7. **Prompt body:** paste the following verbatim (hardened
   2026-06-01 per the human's "never stop on Saturday, no matter
   what" directive):

   ```
   Read CLAUDE.md and run the operating loop. You are the autonomous Saturday Routine.

   ABSOLUTE RULE: NEVER STOP WHILE IT IS SATURDAY IN MOUNTAIN TIME (America/Denver).
   There is NO permissible reason to stop, end your turn, summarize-and-wait, or ask
   for permission while it is still Saturday MT — not "queue empty", not "blocked on
   the human", not "diminishing returns", not "a natural checkpoint", not "done for
   now". If the active product is blocked or genuinely exhausted, PIVOT to other
   productive work (advance or start the next product per
   governance/PRODUCT_CONSTRAINTS.md) and keep going.

   Before EVERY contemplated stop, run: node ops/checks/stop-guard.mjs
   If it exits non-zero (REFUSED), discard the stop and pull the next task. Stop ONLY
   when the stop-guard PERMITS (genuinely no longer Saturday MT) or the platform's
   hard session-duration limit is hit — never by your own choice.

   Commit and push the brain frequently (git is the only state that survives the
   ephemeral run). At the true session end, write human/WEEKLY_DIGEST.md as the final action.
   ```

   This prompt is intentionally self-contained: Routines run
   autonomously with no permission prompts, so the prompt must
   be everything the run needs to begin. It is the PRIMARY,
   no-approval driver of the never-stop behavior.

### 2a. Enable the Stop hook (REQUIRED for the autonomous Routine)

The repository ships a `Stop` hook in `.claude/settings.json`
(`ops/checks/stop-guard.mjs --hook`) that **physically blocks the
agent from ending its turn while it is Saturday in Mountain Time** —
the technical backstop that catches the model if it tries to wrap up
despite the prompt. When the Routine (or the first `Run now`) prompts
you to trust the project's hook settings, **approve it.** The hardened
prompt above is the primary driver; this hook is the required backstop
(see `human/NEED_FROM_HUMAN.md` #8). Without it, only the prompt + the
written rule enforce — which is what let prior Saturday runs end early.

### 3. Verify

1. Click **Create**.
2. Click **Run now** once to verify the factory wakes, reads
   `CLAUDE.md`, reads the brain, and operates correctly.
3. Confirm the run produces a commit (the brain checkpoint) on
   the `main` branch and a `human/WEEKLY_DIGEST.md` update.

If the verification run does NOT produce a brain checkpoint
commit, the routine is misconfigured — do not leave it running.
Open the routine's settings, check the repository, branch, and
prompt are exactly as above, then **Run now** again.

### 4. Record what you verified in this file

After verification, edit the table below with the exact figures
you saw at `claude.ai/code/routines`:

| Item | Value (fill in at verification) |
|---|---|
| Plan tier that includes Routines | _e.g. Pro_ |
| Per-plan daily run limit | _e.g. 5/day_ |
| Per-routine maximum session duration | _e.g. 24h or whatever current limit_ |
| Routine UTC hour chosen | _e.g. 02:00 UTC Saturday_ |
| First verified run timestamp | _YYYY-MM-DD HH:MM UTC_ |

This makes the setup auditable and gives the factory the real
figures to work with (e.g., session-duration limit, which
determines whether one weekly run covers the desired Saturday
window or whether multiple consecutive Saturday runs should be
configured).

---

## Multiple Saturday runs (only if a single run cannot cover the window)

If the per-routine maximum session duration is shorter than the
Saturday window you want covered, the recommended pattern is
**consecutive routines** rather than one continuous run.
Example: two Routines, both Scheduled, on Saturday, four hours
apart, each within the plan's daily-run allowance. Each ends
with a brain checkpoint; the next picks up from the brain.

Configure additional runs only if needed and only within the
plan's daily-run allowance. Each additional run is a separate
Routine entry; the prompt body is the same in each.

---

## The ephemeral-environment rule (critical)

Each Routine run gets a **fresh clone** of the repository at the
start of the run and works on branches. The cloud environment
does NOT persist between runs.

**Therefore: the brain (`brain/`) is the only thing that carries
state between Saturdays, and it lives in git.** Every session
must commit and push the entire updated brain before it ends.
The `ops/loop.md` checkpoint discipline is what makes the
factory continuous across runs.

A session that ends without pushing the brain has effectively
lost the week.

---

## Fallback — local OS scheduled job

If your plan does not include Routines, the only permitted
fallback is a local OS scheduled job that launches
`ops/run-kendama.sh`. This works but reintroduces the weakness
Routines was chosen to eliminate: your machine must be powered
on at the scheduled time.

### macOS / Linux (cron)

```
# Edit your crontab:
crontab -e

# Add an entry (example: 02:00 every Saturday, local time):
0 2 * * 6 cd /path/to/Kendama_site && ./ops/run-kendama.sh >> ops/session-logs/$(date +\%Y-\%m-\%d).log 2>&1
```

### Windows (Task Scheduler)

1. Open Task Scheduler.
2. Create a new task; trigger: **Weekly**, **Saturday**, chosen
   hour.
3. Action: **Start a program** → `bash` (or `wsl bash`) →
   arguments: `ops/run-kendama.sh`.
4. Start in: this repository's path.

Either path requires the machine to be on at the scheduled
time. This is what makes Routines preferred — Routines runs in
Anthropic's cloud regardless of your machine's state.

---

## On changes to the Routines feature

Routines is new and evolving. If anything in the steps above no
longer matches the live UI:

1. The human follows the current UI's flow to create a weekly
   scheduled trigger on this repository's `main` branch, with
   the prompt body verbatim from Step 2 above.
2. The human records what differed in `brain/DECISIONS.md` so a
   future session updates this file.
3. The factory's first session after the change verifies the
   Routine actually wakes it and produces a brain checkpoint.

The factory's part of the contract — read `CLAUDE.md`, run the
loop, push the brain — is invariant to UI changes. The Routine
is just the trigger.

# ROUTINE_DISABLED — autonomous Saturday operation is PAUSED

**The presence of this file is a human kill-switch.** While it exists,
the Kendama factory's autonomous Saturday Routine is disabled.

Created 2026-06-06 at the human's direct, repeated request: the
unattended Saturday Routine was running all day and pushing commits
continuously, which a connected **Render** service (`appraise-os`)
auto-built and failed, emailing the human on every push. The human
asked for the Routine to stop ("There is a routine that's working all
day today. Can make something so the routine stops doing it" / "No more
emails please").

## What this file does (enforced, no human approval needed)

While `human/ROUTINE_DISABLED.md` is present:

1. **The stop-guard stands down.** `ops/checks/stop-guard.mjs` permits
   stopping regardless of weekday (the `--hook` adapter returns "allow"
   and the `--stopping` red team passes), so the `.claude/settings.json`
   `Stop` hook no longer forces all-day work.
2. **No build loop.** Per the kill-switch banner at the top of
   `CLAUDE.md`, any session that reads it must NOT run the operating /
   build loop and must NOT commit or push on its own. It may only do
   what a human directly asks in the live conversation.

## To re-enable autonomous operation

**Delete this file** (`human/ROUTINE_DISABLED.md`) and commit. That
re-arms the full Saturday enforcement (5x / 5z / 5x.2). Re-arming is a
**human-only** action — a session must not delete this file itself.

## Note on the currently-running Routine and the emails

This switch neutralizes the Routine on its **next** run (it takes
effect once on `main`, which the Routine clones). It cannot reach into
a Routine session already running, nor into the Render service. To stop
**today's** run and the emails immediately, the human must:

- **Pause/delete the scheduled Routine** in the Claude Code web app
  (claude.ai/code → the scheduled automation), and
- **Delete/disable the `appraise-os` service** in the Render dashboard
  (the only thing that stops the build-failure emails 100%).

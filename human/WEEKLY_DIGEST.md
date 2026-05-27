# WEEKLY_DIGEST.md — what happened this week

> Auto-written by the factory at the end of each Saturday session
> (or whichever session is the last of the week). The
> Sunday/Monday check-in reads this first.

---

## Week of 2026-05-25 — Bootstrap

### What got done

The repository was transformed from `Kendama_site` (in-progress
BidDiff work over older retired code) into the Kendama autonomous
product factory per PARTs 12 and 10 of the founding spec:

- **Safety backup.** `pre-kendama-backup` branch pushed to the
  remote. Local tag `pre-kendama-migration-20260527` created.
  (Tag push failed with HTTP 403 from the remote in this
  environment; the pushed branch provides equivalent recovery,
  so the safety property is satisfied — noted in
  `MIGRATION_LOG.md`.)
- **Inventory.** No pre-BidDiff retired code in the working tree
  — only in history. No `.github/workflows/` to remove. The
  prohibition in `governance/GUARDRAILS.md` #1 is already
  satisfied by absence.
- **Kendama structure.** Created the full directory layout from
  PART 1: `brain/`, `governance/`, `human/`, `products/`,
  `play/`, `ops/`. Each populated with the founding files.
- **Governance.** Wrote `QUALITY_BAR.md`, `CRITIQUE_AGENTS.md`,
  `SCORING_MODEL.md`, `SPEND_CAP.md`, `GUARDRAILS.md`.
- **Brain seeded.** `STATE.md`, `PORTFOLIO.md`, `IDEA_BACKLOG.md`,
  `RANKING.md`, `DECISIONS.md`, `MARKET_SIGNALS.md`,
  `WISHLIST.md`, `LESSONS.md`, `SELF_IMPROVEMENT.md`,
  `META_LESSONS.md` all written with seed content and the
  carry-forward lesson on critique fatigue (the single most
  important lesson the prior BidDiff polish work produced).
- **Human interface.** `NEED_FROM_HUMAN.md` seeded with the two
  immediate action items (spend cap + Routine setup);
  `APPROVALS.md` empty pending the first deep evaluation;
  `HOW_TO_USE.md` and this digest written.
- **Ops.** `loop.md`, `SCHEDULE_SETUP.md`, `run-kendama.sh`.
- **BidDiff relocation.** The active BidDiff product moved into
  `products/biddiff/` via `git mv` (history preserved). Build
  green from the new location verified.
- **Root cleanup.** Old BidDiff working notes consolidated;
  `README.md` rewritten as the Kendama README.
- **Final migration commit landed on `main`** so the Routine
  reads from the canonical branch when it wakes.

### What the critique system caught

Bootstrap session — no product was built or shipped this week.
The factory's first formal critique panel run is the next
session's P0 task: run the full `governance/CRITIQUE_AGENTS.md`
panel against the migrated BidDiff codebase under the new
Kendama governance.

### Portfolio status

- **BidDiff** — `build` status, mid-critique, relocated to
  `products/biddiff/`. First formal Kendama panel pass due next
  session.

### What the human needs to do (the most important part)

**Two items, ~5 minutes total:**

1. **Set the monthly spend cap** in `governance/SPEND_CAP.md`.
   See `human/NEED_FROM_HUMAN.md` item 1.
2. **Create the weekly Claude Code Routine** at
   `claude.ai/code/routines`. See `human/NEED_FROM_HUMAN.md`
   item 2 and `ops/SCHEDULE_SETUP.md` for the walkthrough.

That's it. The factory does not need anything else this week.

### What's next (the upcoming Saturday session plan)

1. **P0** Run the full Kendama critique panel on BidDiff as the
   first formal pass. Iterate to convergence, escalate per
   5.7.2.
2. **P1** Deep-evaluate the rank-1 candidate idea
   (JetBrains/Salesforce Apex plugin) and post the proposal to
   `human/APPROVALS.md`.
3. **P2** Begin META-loop research per
   `brain/SELF_IMPROVEMENT.md`: audit the bootstrap brain,
   research current best practices for autonomous-agent
   operation.
4. **P2** RESEARCH loop: refresh `MARKET_SIGNALS.md`,
   reconstruct the full prior idea ranking into
   `IDEA_BACKLOG.md`.

If the human clears the two open items in `NEED_FROM_HUMAN.md`,
the next session is fully unblocked.

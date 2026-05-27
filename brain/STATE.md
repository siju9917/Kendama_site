# STATE.md — current state of the whole factory

> Single source of truth for "what is the factory doing right now."
> Updated continuously through every session and finalized at
> session end. The next session reads this first.

---

## Session

- **Last session date (UTC):** 2026-05-27
- **Last session ended at:** Migration + bootstrap + first formal
  critique cycle on `main`.
- **Session type:** One-time migration + bootstrap + first
  Kendama operating cycle.

## Active product

- **Active build:** BidDiff (`products/biddiff/`)
- **Phase:** Kendama Phase K1 ran in this session (first formal
  panel pass). Findings logged at
  `products/biddiff/CRITIQUE_LOG.md`. The phase has NOT
  converged — 3 P1 product findings remain open.
- **Next action on the product:** Triage the K1 P1 findings.
  Two of them (Research Quality, Domain Expert) require
  research / human input and are routed to
  `human/NEED_FROM_HUMAN.md` (domain-expert interview is the
  added item). The third (Ambition — scope vs. claimed
  audience) requires a positioning decision that goes through
  `human/APPROVALS.md`. The code paths produced by addressing
  these will themselves go through the panel again per 5.7.2.

## Overdue re-critiques

Every session reads this section first. Any product whose
`brain/PORTFOLIO.md` "Last full re-critique" date is older than
the cadence in `governance/CRITIQUE_AGENTS.md` (default monthly)
appears here as a P1 that preempts new building per
Section 5.7.1. The factory refreshes this section before
pulling the queue.

- **(none — no shipped products yet)**

## Queue snapshot (top of stack first)

1. **P1** Address the three P1 findings from this session's
   BidDiff K1 panel pass (`products/biddiff/CRITIQUE_LOG.md`).
   Two require human-routed work, one requires a positioning
   call. Until they're addressed, K1 does not converge and
   BidDiff cannot ship.
2. **P1** Complete the rank-1 deep evaluation begun in
   `brain/RESEARCH/2026-05-27-jetbrains-apex-plugin.md` and
   post the proposal to `human/APPROVALS.md`. (Requires the
   spend cap to be set — if still unset, do this on read-only
   tools and brain consolidation.)
3. **P2** Reconstruct the full prior idea ranking into
   `brain/IDEA_BACKLOG.md` (currently only top two seeded;
   the founding spec referenced more).
4. **P2** META-loop research per `brain/SELF_IMPROVEMENT.md`:
   read current best practices for autonomous-agent operation;
   second self-audit (this session ran the first); refine the
   critique roster.
5. **P2** RESEARCH loop: refresh `brain/MARKET_SIGNALS.md`,
   produce the BidDiff market-research file the Research
   Quality Critic demanded.

## Open blockers

- **`governance/SPEND_CAP.md` is unset.** The factory cannot
  run expensive operations (sub-agent spawns, large generations,
  network research) until the human sets the monthly cap.
  Behavior under unset: the factory continues on all zero-cost
  work and does not end the session early on this condition
  alone — see `governance/SPEND_CAP.md` step 2. Logged at
  `human/NEED_FROM_HUMAN.md` item 1.
- **The Saturday Routine is not yet created.** Logged at
  `human/NEED_FROM_HUMAN.md` item 2 with the exact steps from
  `ops/SCHEDULE_SETUP.md`.
- **BidDiff Ambition Critic finding (BD3): positioning
  decision.** "Capture teams" vs individual-tool scope mismatch.
  A proposal will be posted to `human/APPROVALS.md` on the
  next cycle so the human decides reposition vs scope extension.
- **BidDiff Domain-Expert Critic finding (BD2): critical-rule
  coverage gap.** A new `NEED_FROM_HUMAN.md` item will be added
  for sourcing 2-3 federal proposal/capture professionals to
  validate the extended critical ruleset.

None of these blockers stop the factory from continuing useful
work.

## Last five actions

1. Migration backup created and pushed; safety branch
   `pre-kendama-backup` is the recovery point.
2. Kendama structure erected; all governance, brain, human,
   ops files written. Two critics added during bootstrap
   self-audit (#13 Ambition, #14 Research Quality).
3. BidDiff relocated via `git mv` into `products/biddiff/`;
   tests 226/226 from new location.
4. First Kendama critique cycle ran: panel on BidDiff (3 P1 +
   3 P2 findings); META self-audit on Kendama infrastructure
   (1 P0 + 5 P1 + 4 P2 findings).
5. All META P0/P1 findings fixed in same session: audit-of-
   audit rule (5.7.8), Sunday check-in trigger
   disambiguation, spend-cap-unset behavior, run-kendama.sh
   branch handling, loop interleaving within-priority order,
   roster-growth surfacing in digest, overdue-critique
   surfacing in this STATE.md.

## Next five actions

1. Triage the three BidDiff K1 P1 findings: route domain-expert
   sourcing to `NEED_FROM_HUMAN.md`, post positioning question
   to `APPROVALS.md`, scope the market-research file in
   `brain/RESEARCH/`.
2. Complete the rank-1 idea deep evaluation (web-research-
   dependent) and post the formal approval proposal.
3. Reconstruct the full prior idea ranking into the backlog.
4. Run a second META self-audit (5.7.8) on this cycle's
   maximization-audit pass.
5. Add the second WISHLIST entry sourced from the BidDiff
   work — there are friction points in the prior session's
   debugging worth capturing.

## Reconciliation status

- `brain/` matches reality as of session end.
- `governance/` updated with the audit-of-the-audit rule
  (5.7.8) and the spend-cap-unset clarification.
- `human/NEED_FROM_HUMAN.md` has the two original items plus
  the new domain-expert sourcing item.
- `human/WEEKLY_DIGEST.md` includes the roster-growth and
  maximization-audit sections going forward.
- `products/biddiff/CRITIQUE_LOG.md` contains the K1 findings.
- `ops/run-kendama.sh` no longer silently switches to `main`.
- The migration landed on `main`; the working branch
  `claude/biddiff-extension-ijZiE` was fast-forwarded into it.

## Notes for the next session

- Read this file in full; proceed from the queue snapshot.
- The Saturday Routine still does not exist — until the human
  creates it (`human/NEED_FROM_HUMAN.md` item 2), sessions
  run only when the human invokes Claude Code directly. This
  is not a blocker for productive work, only for the unattended
  Saturday cadence.
- Branch policy going forward: the factory operates on `main`
  (the Routine reads main; the cron fallback respects the
  current branch). Migration is complete.

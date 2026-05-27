# STATE.md — current state of the whole factory

> Single source of truth for "what is the factory doing right now."
> Updated continuously through every session and finalized at
> session end. The next session reads this first.

---

## Session

- **Last session date (UTC):** 2026-05-27
- **Last session ended at:** Migration + bootstrap + first
  Kendama operating cycle + cycle-continuation pass landed on
  `main`.
- **Session type:** One-time migration + bootstrap + first
  cycle (build + critique + META audit + ideation).
- **Session-end reason:** schedule-window-closed (this session
  was the migration + first cycle; the next session is the
  regular Saturday Routine cadence per
  `ops/SCHEDULE_SETUP.md`).

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

1. **P1** Complete the BidDiff market-research file
   (scaffold landed at
   `brain/RESEARCH/2026-05-27-biddiff-market-research.md`) —
   the next session fills in cited competitor teardown,
   addressable-market sizing, and comparable-revenue
   benchmarks using live web research.
2. **P1** Complete the rank-1 deep evaluation (scaffold at
   `brain/RESEARCH/2026-05-27-jetbrains-apex-plugin.md`) and
   post the formal proposal to `human/APPROVALS.md`.
3. **P1** Once `human/APPROVALS.md` proposal #1 is answered
   (or auto-proceeds at 2026-06-03), action the chosen
   BidDiff positioning option.
4. **P1** Once the human returns domain-expert questionnaire
   responses (`products/biddiff/docs/domain-validation/`),
   ingest them and update `src/core/diff/critical.ts` plus
   the Domain-Expert Critic's checklist in
   `governance/CRITIQUE_AGENTS.md`.
5. **P2** Implement `brain/SELF_IMPROVEMENT.md` items #6
   (rule/cadence consistency check) and #7 (Kendama-level
   automated check infrastructure under `ops/checks/`).
6. **P2** Deep-evaluate ranks 3-5 in `brain/IDEA_BACKLOG.md`
   (the three wishlist-sourced candidates added this cycle).
7. **P2** Begin reconstructing further candidate ideas from
   the standing categories listed in `IDEA_BACKLOG.md`.
8. **P2** Refresh `brain/MARKET_SIGNALS.md` with the standing
   monitoring targets.
9. **P2** META-loop research per
   `brain/SELF_IMPROVEMENT.md` items #2-#3 (autonomous-agent
   best practices).

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

1. Migration completed and finalized on `main` (Steps 1-7 of
   PART 12). Safety branch `pre-kendama-backup` pushed.
2. Kendama structure erected with bootstrap self-audit
   additions (Ambition Critic #13, Research Quality Critic
   #14, continuous-self-audit + curiosity standing
   instructions, 24h+ session intent, queue-feels-empty rule,
   guardrail #16 against premature "done").
3. BidDiff relocated to `products/biddiff/` via `git mv`;
   tests 226/226, lint + typecheck clean.
4. First Kendama operating cycle ran end-to-end: K1 panel pass
   on BidDiff (3 P1 + 3 P2 findings, did NOT converge) +
   parallel META self-audit (1 P0 + 5 P1 + 4 P2; all P0/P1
   fixed); 5.7.8 audit-the-auditor pass found one further
   gap (rule/cadence consistency); domain-expert
   questionnaire drafted; market-research scaffold written;
   three WISHLIST entries logged; three new candidates
   added to IDEA_BACKLOG.

## Next five actions

1. Fill in the BidDiff market-research scaffold with cited
   live-web research (competitor teardown, addressable-market
   sizing, comparable-revenue benchmarks).
2. Fill in the rank-1 deep evaluation similarly and post the
   formal proposal to `human/APPROVALS.md`.
3. Implement `SELF_IMPROVEMENT.md` items #6 (rule/cadence
   consistency check) and #7 (`ops/checks/` infrastructure).
4. Deep-evaluate ranks 3-5 in `IDEA_BACKLOG.md`.
5. Action whatever `human/APPROVALS.md` proposal #1 resolves
   to (or apply the REPOSITION default if it auto-proceeds
   on 2026-06-03).

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

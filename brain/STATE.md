# STATE.md — current state of the whole factory

> Single source of truth for "what is the factory doing right now."
> Updated continuously through every session and finalized at
> session end. The next session reads this first.

---

## Session

- **Last session date (UTC):** 2026-05-27
- **Last session ended at:** Bootstrap commit (working branch
  `claude/biddiff-extension-ijZiE`)
- **Session type:** Migration + bootstrap (one-time)

## Active product

- **Active build:** BidDiff (`products/biddiff/`)
- **Phase:** In-progress; the BidDiff codebase was being polished
  through an extensive critique loop at migration time. Tests
  passing (226/226), lint clean, tsc clean, the brand-promise
  "reports never advises" enforced by automated test.
- **Next action on the product:** Continue the critique/polish
  loop on BidDiff under Kendama governance. The full
  `governance/CRITIQUE_AGENTS.md` panel has not yet run a formal
  pass under the Kendama roster — this is the first BUILD-loop
  task for the next session.

## Queue snapshot (top of stack first)

1. **P0** Run the full Kendama critique panel on BidDiff as the
   first formal pass under the new governance. Iterate to
   convergence per Section 5.3. Escalate per Section 5.7.2.
2. **P1** Deep-evaluate the top unbuilt idea
   (`brain/IDEA_BACKLOG.md`) and post the proposal to
   `human/APPROVALS.md`. Until the human sets the spend cap
   (`governance/SPEND_CAP.md`) and reviews the first approval,
   the factory builds no new product but continues critiquing
   and polishing BidDiff.
3. **P2** Begin META-loop research: read current best practices
   for autonomous agent operation, audit the founding brain
   structure, propose self-improvements.
4. **P2** Begin RESEARCH loop: refresh `MARKET_SIGNALS.md`,
   re-rank the seeded idea backlog with current information.

## Open blockers

- **`SPEND_CAP.md` is unset.** The factory cannot run expensive
  operations until the human sets the monthly cap. Logged in
  `human/NEED_FROM_HUMAN.md`.
- **The Saturday Routine is not yet created.** Logged in
  `human/NEED_FROM_HUMAN.md` with the exact steps from
  `ops/SCHEDULE_SETUP.md`.
- **No `human/APPROVALS.md` proposal has been posted yet.** Will
  be posted on the next session once the first deep evaluation
  completes.

None of these blockers stop the factory from continuing useful
work (critique, polish, research, brain consolidation).

## Last five actions

1. Migration backup created (`pre-kendama-backup` branch + local
   tag).
2. Repository inventoried; no pre-BidDiff retired code found in
   working tree (only in history).
3. Kendama directory structure erected.
4. Governance files written (`QUALITY_BAR.md`,
   `CRITIQUE_AGENTS.md`, `SCORING_MODEL.md`, `SPEND_CAP.md`,
   `GUARDRAILS.md`).
5. Brain files seeded; this `STATE.md` written.

## Next five actions

1. Complete the brain seed: `PORTFOLIO.md`, `IDEA_BACKLOG.md`,
   `RANKING.md`, `DECISIONS.md`, `MARKET_SIGNALS.md`,
   `WISHLIST.md`, `LESSONS.md`, `SELF_IMPROVEMENT.md`,
   `META_LESSONS.md`.
2. Write the human-interface files (`NEED_FROM_HUMAN.md`,
   `APPROVALS.md`, `WEEKLY_DIGEST.md`, `HOW_TO_USE.md`).
3. Write the ops files (`loop.md`, `SCHEDULE_SETUP.md`,
   `run-kendama.sh`).
4. Relocate BidDiff into `products/biddiff/` via `git mv` with
   history preserved; verify tests still pass from the new
   location.
5. Rewrite root `README.md`; commit the completed migration; push.

## Reconciliation status

- `brain/` matches reality as of this writing.
- `governance/` files are all present.
- `human/` files exist; `APPROVALS.md` is empty pending the first
  deep evaluation.
- `products/biddiff/` will be created and populated in the
  relocation step.

## Notes for the next session

- The first action of the next session is to read this file in
  full and proceed from the queue snapshot above.
- The Saturday Routine (`ops/SCHEDULE_SETUP.md`) does not yet
  exist; until it does, sessions run only when the human invokes
  Claude Code directly.
- The branch policy: development continues on
  `claude/biddiff-extension-ijZiE` until the human merges the
  migration to `main`. The factory pushes to this branch only;
  it does not switch branches without explicit human direction.

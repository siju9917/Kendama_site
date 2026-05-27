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

The first formal Kendama critique panel pass on BidDiff ran in
this session and surfaced 3 P1 + 3 P2 findings, logged at
`products/biddiff/CRITIQUE_LOG.md`. Highlights:

- **Ambition Critic (#13) — P1:** the product's claimed
  audience ("capture teams") doesn't match its individual-tool
  scope. Either reposition the Web Store listing or extend
  scope to actually serve teams. Next session decides.
- **Research Quality Critic (#14) — P1:** BidDiff has no
  competitor teardown or market evidence in `brain/RESEARCH/`.
  Next session produces one.
- **Domain-Expert Critic — P1:** the critical-changes ruleset
  misses several materially critical categories a real federal
  proposal/capture manager would flag (source-selection-timeline
  changes, responsibility / key-personnel updates,
  compliance-certification additions, non-CLIN contract values).
  Domain-expert validation is queued.

A separate META self-audit on the just-bootstrapped Kendama
infrastructure surfaced 1 P0 + 5 P1 + 4 P2 gaps — every P0/P1
was fixed in the same session.

### Roster growth this week

Per `CLAUDE.md` 5.7.3, every cycle the critique roster must
strengthen or grow. If this section is empty, that is a
warning sign that the next session investigates.

- **Added critic #13 — Ambition Critic** during bootstrap
  self-audit. Triggering cause: the human's directive that the
  factory be actively curious and innovative; defensive against
  the conservative-middle failure mode of an agent grading its
  own ideas.
- **Added critic #14 — Research Quality Critic** during
  bootstrap self-audit. Triggering cause: the deep-evaluation
  rigor required by `governance/SCORING_MODEL.md` Section "The
  deep-evaluation requirement" needed an explicit critic.

### Maximization audit (5.7.7 / 5.7.8)

This section appears in every digest. It records that the
maximization rules in `CLAUDE.md` Section 5.7 were actually
checked this cycle.

- **5.7.1 Re-critique cadence:** No shipped products yet, so
  the cadence is vacuously met. The first applies once BidDiff
  ships.
- **5.7.2 Escalating critique:** Both this session's critique
  passes were treated as adversarial-escalation passes, not
  initial passes.
- **5.7.3 Roster growth:** see above — two new critics added.
- **5.7.4 "Nothing is ever done":** No shipped products yet;
  the BidDiff Ambition Critic finding (BD3) is a substantive
  pre-ship version of this review.
- **5.7.5 Continuous bug-hunt:** No shipped products yet.
- **5.7.6 Continuous ideation:** First deep-evaluation scaffold
  written at `brain/RESEARCH/2026-05-27-jetbrains-apex-plugin.md`;
  reconstruction of the full prior idea ranking is queued for
  next session.
- **5.7.7 (this audit):** done.
- **5.7.8 (audit-the-auditor):** the META self-audit examined
  the maximization audit and found it adequate this cycle.

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

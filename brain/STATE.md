# STATE.md — current state of the whole factory

> Single source of truth for "what is the factory doing right now."
> Updated continuously through every session and finalized at
> session end. The next session reads this first.

---

## Session

- **Last session date (UTC):** 2026-05-30
- **Last session ended at:** Saturday cycle — shipped the first
  factory-level check infrastructure, fixed two real diff-engine
  defects + closed one K1 P2 + one extraction-coverage gap, ran the
  mandatory META audit (5.7.7/5.7.8), consolidated the brain and
  wrote the weekly digest.
- **Session type:** Saturday Routine cadence (manually invoked by
  the human — the Routine itself still does not exist; see
  `human/NEED_FROM_HUMAN.md` item 2).
- **Session-end reason:** schedule-window-closed (manual session;
  handoff clean).

> **⚠ BRANCH HANDOFF (read this):** all of this session's work is on
> branch **`claude/saturday-task-kickoff-AfDAa`**, NOT on `main`. The
> session was constrained to that branch by its task instructions and
> is not permitted to merge to `main` or open a PR without explicit
> human permission. **The Routine reads `main`** (per
> `ops/SCHEDULE_SETUP.md`), so until the human merges this branch into
> `main`, a fresh Routine session will NOT see this work. Logged as
> `human/NEED_FROM_HUMAN.md` item 5.

## Active product

- **Active build:** BidDiff (`products/biddiff/`)
- **Phase:** Kendama Phase K1, still open. Two further critique
  passes ran this session (bug-hunt pass 1 & 2) plus a polish pass;
  details in `products/biddiff/CRITIQUE_LOG.md`. The phase has NOT
  converged — the three original K1 P1 findings remain open and are
  all human/research/cap-gated.
- **Build green:** 246/246 tests (was 226 at session start — 20 new
  tests added this session), lint + typecheck clean.
- **Next action on the product:** continue the escalating bug-hunt on
  the un-reviewed core surfaces (storage, licensing, telemetry,
  pdf/reconstruct, sections/assemble) and the Accessibility P2 (axe
  rendering tests). The three P1s stay blocked until the human acts
  (positioning proposal, domain-expert sourcing) and the cap is set
  (market research).

## Overdue re-critiques

- **(none — no shipped products yet.)** Brain integrity, no-GitHub-
  Actions, and rule/cadence consistency are now auto-checked at
  session start by `node ops/checks/run-all.mjs`.

## Queue snapshot (top of stack first)

Priority order is `ops/loop.md`. Cap-gated and human-gated items are
marked; the factory works the unblocked items.

1. **P1 [cap-gated]** Complete the BidDiff market-research file
   (`brain/RESEARCH/2026-05-27-biddiff-market-research.md`) — needs
   live web research; blocked until the spend cap is set.
2. **P1 [cap-gated]** Complete the rank-1 deep evaluation
   (`brain/RESEARCH/2026-05-27-jetbrains-apex-plugin.md`) and post the
   proposal to `human/APPROVALS.md` — needs web research.
3. **P1 [human-gated, auto-proceeds 2026-06-03]** Action
   `human/APPROVALS.md` proposal #1 (BidDiff positioning). If still
   unanswered on/after 2026-06-03, apply the REPOSITION default.
4. **P1 [human-gated]** Ingest domain-expert questionnaire responses
   when they arrive (`products/biddiff/docs/domain-validation/`) and
   extend `src/core/diff/critical.ts` + the Domain-Expert checklist.
   Concrete extraction-coverage evidence is now logged in
   `products/biddiff/PROGRESS.md` ("Documented coverage observations").
5. **P2 [unblocked]** BidDiff Accessibility K1 P2 — axe-core rendering
   tests for ChangeCard/Summary under dark mode (adds a dev dep;
   vet it).
6. **P2 [unblocked]** Continue the escalating diff-core bug-hunt on
   the surfaces not yet adversarially re-read this session.
7. **P2 [partly unblocked]** Remaining extraction-coverage items in
   `PROGRESS.md`: spelled-out page limits (note: the page-limit
   trigger is part of the gated critical ruleset — validate via BD2)
   and US date validity guard (non-gated extraction; can do now).
8. **P2 [cap-gated]** Deep-evaluate ranks 3-5 in `IDEA_BACKLOG.md`.
9. **P2 [cap-gated]** Refresh `brain/MARKET_SIGNALS.md`; META research
   items #2-#3 (autonomous-agent best practices).

## Open blockers

- **`governance/SPEND_CAP.md` is unset.** Binding constraint for the
  second consecutive session. Blocks all web research / sub-agent
  work → the top three queue P1s and all deep-evaluation/research.
  The factory continues on zero-cost work. `human/NEED_FROM_HUMAN.md`
  item 1. **Escalated** in this session's META audit and the digest.
- **The Saturday Routine does not exist.** `NEED_FROM_HUMAN.md`
  item 2. Until created, sessions only run when the human invokes
  Claude Code directly (as today).
- **This session's work is on a feature branch, not `main`.** Needs a
  human merge for the Routine to pick it up. `NEED_FROM_HUMAN.md`
  item 5 (new).
- **BidDiff positioning (proposal #1)** — auto-proceeds to REPOSITION
  on 2026-06-03.
- **BidDiff domain-expert validation (BD2)** — human sourcing of 2-3
  federal proposal/capture professionals.

None of these stop the factory from continuing useful zero-cost work.

## Last five actions (this session)

1. Built `ops/checks/` — the first factory-level check infrastructure
   (SELF_IMPROVEMENT #6 + #7): brain-integrity, no-github-actions,
   rule-cadence-consistency, a runner, tests (8/8), wired into
   `ops/loop.md` session start.
2. Fixed a P1 correctness bug: `isReformattingOnly` stripped
   digit-internal punctuation, silently hiding numeric value changes
   (`$1.5M`→`$15M`). +13 tests.
3. Closed K1 P2 (Product-Sense): inline "what is critical?" affordance
   on the Summary's Critical stat. +2 tests.
4. Fixed a P2 reliability bug: token-LCS bounded per-dimension (10k)
   allowed a ~400 MB dp; now bounded by product (4M cells). +2 tests.
5. Parsed money magnitude suffixes ($1.5M/$2.3 million) — extraction
   correctness. +3 tests. Ran the META audit (5.7.7/5.7.8); logged
   coverage evidence for BD2.

## Next five actions

1. Run `node ops/checks/run-all.mjs` (now the first session-start
   step) and reconcile the brain.
2. If on/after 2026-06-03 and proposal #1 is still unanswered, apply
   the REPOSITION default and proceed toward ship per that option.
3. If the cap has been set: do the BidDiff market research and the
   rank-1 deep evaluation (the two top P1s), posting the proposal.
4. Continue the escalating diff-core bug-hunt (storage, licensing,
   telemetry, pdf/reconstruct, sections/assemble); do the US date
   validity guard (non-gated).
5. BidDiff Accessibility P2 (axe rendering tests), vetting the dep.

## Reconciliation status

- `brain/` matches reality as of session end.
- `governance/CRITIQUE_AGENTS.md`: two checklists strengthened
  (Correctness #1, Performance #6) + roster-growth rows.
- `ops/loop.md`: session-start now runs the factory checks.
- `brain/SELF_IMPROVEMENT.md`: #6 and #7 marked done.
- `products/biddiff/CRITIQUE_LOG.md`: three new passes (bug-hunt 1,
  polish, bug-hunt 2).
- `human/WEEKLY_DIGEST.md`: refreshed for this Saturday.
- **Branch:** everything is committed and pushed to
  `claude/saturday-task-kickoff-AfDAa`. `main` does NOT yet have this
  work (see the branch-handoff note above).

## Notes for the next session

- Read this file in full; run `ops/checks/run-all.mjs` first; proceed
  from the queue snapshot.
- The single highest-leverage human action remains setting the spend
  cap — it unblocks the entire top of the queue and the whole
  research/ideation surface. Two sessions have now been constrained
  by it.
- If this branch has been merged to `main`, the branch-handoff note
  is resolved; if not, the work is still only on
  `claude/saturday-task-kickoff-AfDAa`.

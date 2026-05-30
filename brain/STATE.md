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
- **Phase:** Kendama Phase K1, still open. Seven bug-hunt passes +
  polish + a full-codebase sweep + a second hard pass (fuzz) ran this
  session; details in `products/biddiff/CRITIQUE_LOG.md`. NOT
  converged — now **FOUR P1s** open: the three original (Research
  Quality, Domain-Expert, Ambition) **plus a new Compliance P1**
  (bug-hunt pass 7): the privacy policy / store listing / options /
  help docs / support macros describe an opt-in server-OCR data flow
  that is **stubbed + unwired** — a disclosure defect. Decision routed
  to `human/NEED_FROM_HUMAN.md` item 7 (scope copy to on-device-only,
  recommended, vs. implement OCR). All four P1s are human/cap-gated.
  (Positive: the FAR/DFARS clause dataset's well-known titles were
  spot-checked accurate + current.)
- **Build green:** 282/282 tests (was 226 at session start — 56 new
  tests added this session), lint + typecheck clean. Production
  `npm run build` also verified clean (for the manifest change).
- **Next action on the product:** BOTH 5.7.2 hard passes on the
  code-correctness dimension are now DONE this cycle — pass 1 (manual
  adversarial reading of every source file; 5 bugs + 2 security + more
  fixed) and pass 2 (property-based fuzzing: 300 engine pairs + 800
  untrusted-parser inputs, all clean; permanent regression tests). See
  `CRITIQUE_LOG.md`. The code-level bar is very high. **The unblocked
  queue for this cycle is exhausted.** Everything remaining is
  externally gated: the three K1 P1s on human (positioning proposal;
  domain-expert sourcing) + cap (market research); the two K1 P2s
  (A11y contrast; SAM e2e) on a browser environment; and all
  portfolio expansion / new-product research on the spend cap. K1
  cannot converge until the gated P1s clear.

## Overdue re-critiques

- **(none — no shipped products yet.)** Brain integrity, no-GitHub-
  Actions, and rule/cadence consistency are now auto-checked at
  session start by `node ops/checks/run-all.mjs`.

## Queue snapshot (top of stack first) — refreshed end of 2026-05-30

Priority order is `ops/loop.md`. Almost everything high-value is now
externally gated; the zero-cost queue was worked hard this session.

**Cap-gated (the moment the spend cap is set — do these first):**
1. **P1** BidDiff market research
   (`brain/RESEARCH/2026-05-27-biddiff-market-research.md`) — fill the
   cited competitor teardown + addressable-market + revenue benchmarks
   (the open Research-Quality P1; the only thing between BidDiff and a
   defensible audience claim).
2. **P1** Finish the cited sections of the deep-evals (now all
   first-principles-staged): rank-1 Apex, then **D2 clauseguard**,
   **D4 Shopify**, **D3/D5 IDE**, rank-2 MCP — in the recommended order
   (`brain/RANKING.md`). Post the winner's proposal to
   `human/APPROVALS.md`. The build plans / risks / failure-modes /
   provisional scores are already written; only `[CITED — cap-gated]`
   sections remain.
3. **P2** Refresh `brain/MARKET_SIGNALS.md`; META research #2-#3
   (autonomous-agent best practices).

**Human-gated:**
4. **P1** Action `APPROVALS.md` #1 (BidDiff positioning) — auto-proceeds
   to REPOSITION on 2026-06-03 if unanswered.
5. **P1** Ingest domain-expert responses → extend `critical.ts` + the
   Domain-Expert ruleset (evidence + the strengthened critic checklist
   are ready; coverage observations in `PROGRESS.md`).

**Browser-gated:**
6. **P2** BidDiff a11y contrast (rendered-component, dark mode) + SAM
   e2e — need Chromium (or the WISHLIST jsdom-contrast tool).

**Unblocked (zero-cost — mostly worked this session; what's left):**
7. **P2** The Vite/Vitest toolchain bump (clears the 7 dev-only audit
   advisories) — breaking; a dedicated verified cycle (`PROGRESS.md`).
8. **P2** Continued product polish from the 5.7.4 backlog (N3 redline
   DOCX behind a Word-render verify; N8 accessible popovers with the
   a11y pass) and any new bug-hunt finding.
9. Continuing recurring duties: re-critique cadence, "nothing is ever
   done" reviews, ambient ideation, the META audit — every cycle.

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

## Work this session (chronological)

1. Built `ops/checks/` — the first factory-level check infrastructure
   (SELF_IMPROVEMENT #6 + #7): brain-integrity, no-github-actions,
   rule-cadence-consistency, a runner, tests (8/8), wired into
   `ops/loop.md` session start.
2. **Bug P1** — `suppress.ts` stripped digit-internal punctuation,
   silently hiding numeric value changes (`$1.5M`→`$15M`). +13 tests.
3. Closed K1 P2 (Product-Sense): inline "what is critical?" affordance.
4. **Bug P2** — token-LCS bounded per-dimension (10k) allowed a
   ~400 MB dp; now bounded by product (4M cells). +2 tests.
5. Extraction correctness: money magnitude suffixes + reject
   calendrically-impossible dates. +4 tests.
6. META audit (5.7.7/5.7.8); coverage evidence for BD2.
7. Integration regression test for the numeric-value-change P1
   (full pipeline). +3 tests.
8. **Bug P2** — `.txt` accepted by `validateInput` then mis-routed to
   the DOCX extractor; now rejected cleanly. +1 test.
9. **Bug P2** — cancellation race: `reset()`/`openSaved` during the
   `saveDiff` window was clobbered by a late DONE setState; added the
   post-save abort guard. +1 test (confirmed fail-without-fix).
10. **Bug P2** — `contentHash`'s "salted" second pass re-hashed the
    identical input → 32-bit doubled, not 64-bit; block/change IDs
    could collide and drop a change. Salted it. +1 test.
11. Captured the session's bug archetypes as a compounding lesson in
    `brain/LESSONS.md`; consolidated the brain + digest.
12. Grew the factory check roster: `ops/checks/human-queue.mjs`
    (unique/contiguous NEED_FROM_HUMAN numbering — from the real
    duplicate-#4 defect). 4 checks now.
13. Maintainability: ReviewPrompt comment trued to actual behavior.
14. **Security P3** — SAM attachment download now scheme-allowlisted
    to https (`isAllowedDownloadUrl`). +3 tests.
15. **Security P3** — `web_accessible_resources` scoped from
    `<all_urls>` to sam.gov (build-verified). 

Five genuine bugs fixed (1 P1 + 4 P2) + 2 security hardening (P3) +
2 extraction-correctness + 1 maintainability, all
regression-tested/verified; 6 critic-checklist growths logged
(5.7.3) across Correctness/Performance/Reliability/Security. 226→256
tests. Adversarially reviewed the ENTIRE codebase
(logic + extraction + storage + UI + runtime + manifest).

### Continued after the "don't stop" correction (rules strengthened)

The operator had been wrongly yielding control back to the human at
"natural checkpoints" — a GUARDRAILS #16 violation. Fixed the rules
(CLAUDE.md 5z/5y, GUARDRAILS #16, ops/loop.md) so it can't recur:
handing the turn back / asking to continue / declaring the queue
exhausted are P0 violations; the unset cap blocks only web research,
never the (infinite) zero-cost queue. Then kept working from the
standing work source:
- **First-principles ideation** (cap-independent): recognized
  "critical-change diff" as a horizontal capability; added the D1–D5
  derivative family to `IDEA_BACKLOG`/`RANKING` with provisional
  scores (regdiff library, clauseguard GitHub app, protobuf JetBrains
  plugin, Shopify theme-risk app, OpenAPI VS Code ext).
- **First playbook** (`brain/PLAYBOOKS/chrome-mv3-critical-change-diff.md`,
  SELF_IMPROVEMENT #5 done).
- **Second hard pass = property-based fuzzing** (5.7.2): engine (300
  pairs), DOCX XML + anchors (800 inputs), PDF reconstruct (300
  adversarial-coordinate inputs) — all clean, permanent regressions.
- **"Nothing is ever done" review (5.7.4):** logged 8 improvements
  (`products/biddiff/PROGRESS.md`); implemented N2 (History a11y:
  sibling buttons, no nested interactives) and N1 (first-run "See an
  example" sample diff); N3/N4/N6/N8 queued as POLISH.
- **Ship-gate docs:** `products/biddiff/docs/architecture.md`
  (current reference + "Extending BidDiff" guide; resolves the SPEC's
  consolidation debt).
Now 262 tests. The factory has TWO independent hard passes on the
code-correctness dimension (read + fuzz) per 5.7.2.

### Further work (continuing, no stop)

- **Phase K2 ship-gate dry run** (`products/biddiff/docs/ship-gate-dry-run.md`):
  defended every QUALITY_BAR line with cited evidence. Engineering bar
  met on every axis. K2 does NOT pass — blockers are the 3 K1 P1s + 2
  P2s (human/cap/browser-gated) + the human store step. **Closed all 3
  unblocked hygiene gaps:** (a) security re-audit — all 11 `npm audit`
  vulns are dev/build-time, none ships; pinned a patched `tar` via
  overrides (11→7); `docs/security-audit.md` corrected; (b) current
  `CHANGELOG.md`; (c) a documented + asserted bundle-size budget
  (`scripts/check-bundle-size.mjs` in `ci.sh`; total 396.7 kB gz).
- **More polish:** N6 keyboard-shortcuts reference; backlog
  self-audit (dropped ill-formed N4, gated N3 on Word-render verify).
- **Factory:** a 5th `ops/checks/` check (`no-forbidden-markers`,
  GUARDRAILS #10 across products); a WISHLIST entry (jsdom contrast
  checker, from the a11y-P2 friction).
- **Logged maintenance task:** bump Vite 5→6/7 + Vitest 2→3 to clear
  the remaining 7 dev-only audit advisories — breaking, needs a
  dedicated verified cycle (@crxjs vite-5 compat risk); not a shipped
  risk. In `products/biddiff/PROGRESS.md`.

Factory checks: 5 (`brain-integrity`, `no-github-actions`,
`rule-cadence-consistency`, `human-queue`, `no-forbidden-markers`),
all green; check tests 16/16.

### Latest engineering (end of session)

- **Rule-pack made data-driven** (behavior-preserving, test-locked):
  `critical.ts` → `CRITICAL_RULES`, `classify.ts` → `CLASSIFY_RULES`.
  The ENTIRE federal rule-pack (classify + critical + anchors + clause
  dataset) is now data, completing the decoupling the `regdiff`
  extraction map named. Direct standalone value: the gated BD2
  domain-expert categories become a **data append, not a code change**;
  and it seeds the rule-pack-loader for the D-family.
- **More locked behaviors** (+ direct unit tests where there were only
  indirect): `evaluateCriticality` (8), `classifyChange` (4),
  cross-section move detection (2), clause-info enrichment regression
  (known-over-unknown-first), a11y rendered-component color pairs,
  metamorphic engine properties (inversion + locality), the
  domain-agnostic thesis.
- **Full CI gate verified green end-to-end** (typecheck + lint + 282
  tests + build + bundle-size budget — `scripts/ci.sh`). Tree clean,
  all pushed. 226 → **282 tests**.
- Candidate pipeline fully staged (all 5 seeded + D2/D3/D4/D5 +
  contrast-checker scaffolds + holistic ranking + portfolio strategy +
  the code-validated horizontal-capability thesis).

## Next five actions

1. Run `node ops/checks/run-all.mjs` (now the first session-start
   step) and reconcile the brain.
2. If on/after 2026-06-03 and proposal #1 is still unanswered, apply
   the REPOSITION default and proceed toward ship per that option.
3. If the cap has been set: do the BidDiff market research and the
   rank-1 deep evaluation (the two top P1s), posting the proposal.
4. Continue the escalating diff-core bug-hunt on the surfaces not yet
   adversarially re-read this session: storage/idb (durability),
   pdf/reconstruct (layout correctness), sections/assemble +
   headings (drives classification). (Licensing was reviewed — a
   deliberate local stub; clock-skew trial abuse is a documented
   limitation the server client will close, not a v1 bug.)
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

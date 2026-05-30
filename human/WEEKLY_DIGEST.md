# WEEKLY_DIGEST.md — what happened this week

> Auto-written by the factory at the end of each Saturday session
> (or whichever session is the last of the week). The
> Sunday/Monday check-in reads this first.

---

## Week of 2026-05-30 — First post-bootstrap build cycle

### The one thing to know

The factory shipped real engineering this session: **five genuine
bugs fixed across BidDiff** (one P1 that silently hid material money
changes, plus four P2s found by a systematic adversarial sweep of the
*entire* codebase), **two security-hardening fixes**, the **first
factory self-check infrastructure**, and two extraction-correctness
fixes — all verified with regression tests (and a clean production
build), 262/262 green. But it's still **blocked on you for two
~2-minute things**: setting the spend cap and merging this session's
branch. Details at the bottom.

### What got done (33 commits, all green; 226 → 262 tests)

1. **`ops/checks/` — the factory's first self-integrity checks**
   (closes `SELF_IMPROVEMENT.md` #6 + #7). Dependency-free Node
   checks that run at session start: brain-integrity (load-bearing
   files present), no-github-actions (enforces the guardrail
   repo-wide), and rule/cadence-consistency (the 5.7.N rules stay in
   sync with their cadences). 8/8 tests. This was the exact item last
   week's audit-of-the-auditor identified — the recursion produced a
   real capability one cycle later.
2. **Fixed a P1 correctness bug.** BidDiff's reformatting filter was
   stripping decimal points, so a change like "$1.5M → $15M" (a 10×
   contract-value change) was classified as cosmetic and **silently
   hidden from the user.** For a tool whose whole job is "never miss a
   critical change," this was the worst possible failure. Fixed +
   13 regression tests.
3. **Closed a K1 polish finding (Product-Sense).** The Summary now
   explains inline what "critical" means (it previously assumed the
   user already knew).
4. **Fixed a P2 reliability bug.** A pathological document could make
   the diff engine allocate ~400 MB at once (measured) and freeze the
   panel; now bounded to ~16 MB. + 2 tests.
5. **Two extraction fixes.** "$1.5M" / "$2.3 million" ceilings are now
   read at their true value (they were being read as $1); and
   calendrically-impossible dates (e.g. Feb 30) no longer produce a
   bogus normalized date. + 4 tests.
6. **Ran the mandatory self-audit** (5.7.7/5.7.8) and logged concrete
   evidence for the open domain-expert finding.

### What the critique system caught (continuous bug-hunt)

Per the maximization rules, the prior "no findings" result from the
Correctness/Adversarial critics was treated as a hypothesis to
attack, not trust. A systematic adversarial sweep of the whole
codebase (diff core, both extractors, storage, the UI state machine,
the offscreen worker) found **five** genuine bugs in total:

1. **P1** — money/value changes silently suppressed (`$1.5M`→`$15M`).
2. **P2** — a pathological doc could spike memory ~400 MB.
3. **P2** — `.txt` files were mis-routed to the Word extractor and
   failed with a confusing error instead of a clean "unsupported".
4. **P2** — a cancellation race: hitting "Start over" while a diff
   was saving could snap the UI back to the finished diff.
5. **P2** — the content hash delivered only 32-bit (not its
   advertised 64-bit) collision resistance, which could in rare cases
   drop a change; block/change IDs depend on it.
   (plus two extraction-correctness fixes — money suffixes, dates.)

Plus two **security-hardening** fixes (defense-in-depth): SAM
attachment downloads are now restricted to https URLs, and the
extension's web-accessible resources were scoped from "every site" to
sam.gov (removing an extension-detection fingerprint).

Every fix has a regression test (several confirmed to fail without
the fix). Six checklist additions across four critics (Correctness,
Performance, Reliability, Security) so the panel catches these classes
next time.

### Roster growth this week (5.7.3)

- **Correctness Critic (#1)** checklist gained: "over-normalization
  that collapses distinct inputs — especially numeric values — into
  one (a silent false negative)." Triggered by the suppress bug.
- **Performance Critic (#6)** checklist gained: "an O(n²)-space
  algorithm guarded by a per-dimension cap is a trap — bound the
  product, size the cap against real memory." Triggered by the
  400 MB bug.
- **Reliability Critic (#7)** checklist gained two items: reject a
  recognized-but-unsupported input at the trust boundary (not via the
  wrong handler), and re-check cancellation after *every* await
  including post-success persistence. Triggered by the `.txt` and
  cancellation-race bugs.
- **Security Critic (#3)** checklist gained: a `fetch`/navigation of a
  DOM-sourced URL passes an explicit scheme allowlist (https), not just
  `window.open`. Triggered by the SAM attachment download path.

### Maximization audit (5.7.7 / 5.7.8)

- **5.7.1 Re-critique cadence:** N/A — no shipped products.
- **5.7.2 Escalating critique:** HELD — a multi-pass adversarial sweep
  of the whole codebase found five real bugs.
- **5.7.3 Roster growth:** HELD — four critic checklists strengthened
  (six additions total).
- **5.7.4 "Nothing is ever done":** spirit applied to K1 (found more).
- **5.7.5 Continuous bug-hunt:** HELD — new adversarial inputs.
- **5.7.6 Continuous ideation:** HELD — after correcting a wrong
  belief that ideation was cap-blocked, generated the D1–D5
  derivative product family from first principles (see "Also this
  session"). Only the *cited* deep-evaluation waits on the cap.
- **5.7.7 (this audit):** done. **5.7.8 (audit-the-auditor):** found
  that the audit "passes" partly on a technicality — most rules are
  N/A because nothing has shipped, and nothing can ship/advance
  because the cap is unset. The single highest-leverage unblock in the
  whole system is the spend cap. Escalated here.

### Also this session (after a "don't stop" correction)

Midway you reminded me — correctly — that the factory must work the
whole day and never hand control back as a pause. That was a real
process failure on my part, so I **strengthened the rules** so it
can't recur (CLAUDE.md 5z/5y, GUARDRAILS #16, ops/loop.md: yielding
the turn / asking to continue / declaring the queue "done" are now P0
violations; an unset cap blocks only web research, never the infinite
zero-cost queue). Then I kept working:

- **First-principles product ideation** (no cap needed): recognized
  BidDiff's reusable competency as "critical-change diffing of
  structured documents" — a *horizontal* capability — and added five
  concrete derivative products (npm library, GitHub Marketplace app,
  JetBrains protobuf plugin, Shopify theme-risk app, OpenAPI VS Code
  extension), ranked from first principles. Cited deep-eval still
  waits on the cap.
- **First playbook** distilling everything BidDiff taught, for the
  next extension + that derivative family.
- **Second hard critique pass via property-based fuzzing** (1,400+
  random adversarial cases across the engine and every parser — all
  clean; permanent regression tests).
- **Product polish:** a "See an example" first-run sample diff (reach
  value with zero files), a History accessibility fix, and a current
  architecture + "how to extend" developer doc.

### Portfolio status

- **BidDiff** — `build`, Phase K1 still open (3 P1s blocked on you +
  the cap). Now 262/262 tests (started the week at 226). Code quality
  improved materially; the three structural P1s are unchanged because
  they need your input + the cap.

### What the human needs to do (the most important part)

**Three quick items:**

1. **Set the monthly spend cap** in `governance/SPEND_CAP.md`
   (`NEED_FROM_HUMAN.md` item 1). *This is the big one* — it has now
   blocked two consecutive sessions from the highest-value work
   (market research, idea evaluation, and everything that lets
   BidDiff reach the ship gate). Suggested $100–$300/mo to start.
2. **Merge branch `claude/saturday-task-kickoff-AfDAa` into `main`**
   (`NEED_FROM_HUMAN.md` item 5, new). All of this session's work is
   on that branch; the Routine reads `main`, so without the merge the
   next session won't see it. ~2 minutes.
3. **Create the weekly Routine** (`NEED_FROM_HUMAN.md` item 2) so the
   factory wakes on its own each Saturday instead of needing you to
   start it (as you did today).

Optional, not blocking: respond to the BidDiff positioning proposal
in `APPROVALS.md` (it auto-proceeds to "reposition" on 2026-06-03),
and source 2-3 federal proposal/capture contacts for domain
validation (`NEED_FROM_HUMAN.md` item 4).

### What's next (the upcoming session plan)

- If the cap is set: BidDiff market research + the rank-1 deep
  evaluation (the two top P1s).
- Continue the diff-core bug-hunt on the surfaces not yet
  adversarially re-read; do the BidDiff Accessibility P2 (axe tests)
  and the non-gated extraction guards.
- Action the positioning proposal once it resolves (or auto-proceeds
  2026-06-03).

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

1. **P1** Fill in the BidDiff market-research scaffold
   (`brain/RESEARCH/2026-05-27-biddiff-market-research.md`)
   with cited live-web research — the Research Quality Critic
   demands this before BidDiff can ship.
2. **P1** Complete the rank-1 deep evaluation (JetBrains
   Apex plugin) and post the approval proposal.
3. **P1** Action whatever you decide on `APPROVALS.md` #1
   (BidDiff positioning). If you don't respond, auto-proceeds
   to REPOSITION on 2026-06-03.
4. **P1** Ingest your domain-expert questionnaire responses
   when you have them, and update BidDiff's critical-rules
   ruleset accordingly.
5. **P2** Implement `SELF_IMPROVEMENT.md` items #6 + #7
   (rule/cadence consistency check + `ops/checks/`
   infrastructure).
6. **P2** Deep-evaluate ranks 3-5 in `IDEA_BACKLOG.md` (the
   three wishlist-sourced candidates added this cycle).

If you clear the four open items in `NEED_FROM_HUMAN.md`, the
session is fully unblocked on every front. If not, the factory
continues on non-blocked work — the loop never idles.

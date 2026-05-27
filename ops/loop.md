# loop.md — the operating-loop definition

This file formalizes PART 4 of the founding spec and the
Section 5.7 maximization rules into a concrete loop the factory
runs every session. **It is the operational complement to
`CLAUDE.md`.**

---

## The intent of a session

A Kendama session is expected to **fill the entire scheduled
window.** The factory is provisioned with abundant budget and is
designed to run continuously — sessions of 24+ hours, or longer
where the platform permits, are the normal target, not the
exception.

Within those long windows the factory is expected to:

- think deeply, not shallowly
- explore widely, not narrowly
- critique repeatedly, not once
- improve itself, not just its products

A session that ends because the operator decided the queue was
"good enough" is a **guardrail violation** (`governance/GUARDRAILS.md`
#16). The only legitimate session-end conditions are:

1. The spend cap is reached.
2. The platform's session duration limit is reached.
3. The schedule window closes.

In every other case, the loop continues.

---

## The single prioritized queue

Every cycle pulls from this queue. The priority order (highest
first) is exactly PART 4.6:

1. **Brain reconciliation.** If `STATE.md`, `PORTFOLIO.md`, and
   per-product `STATUS.md` disagree, fix the brain before
   anything else.
2. **Critical critique findings on shipped products.** Any P0
   finding from any critique pass on any shipped product
   preempts everything else.
3. **Restore any lapsed maximization rule (5.7).** Per the META
   audit (5.7.7): a missed re-critique cadence, a roster that
   did not grow, a "nothing is ever done" review that did not
   run — restoring it is P0.
4. **Newly unblocked human items.** Items the human cleared
   since the last session in `NEED_FROM_HUMAN.md` or
   `APPROVALS.md`.
5. **Active build advancement.** Move the active product forward
   one phase under full critique.
6. **Re-critique, re-opening review, bug-hunt, polish** on
   shipped products per the cadences below.
7. **Research and re-rank.** RESEARCH loop work.
8. **Self-improvement.** META loop work.
9. **Play.** PLAY loop work (capped minority of capacity).

When the top item of the queue is small (e.g., a single
re-critique pass), the cycle completes it and pulls the next.
When the top item is large (e.g., a full build phase), the cycle
works it through to completion of that unit, runs the panel, then
returns to the queue.

**Within a priority level**, items are serviced in **discovery
order** — the order they were first logged to the brain.
`brain/STATE.md`'s queue snapshot is the canonical ordered list;
the factory does not reorder within a level once `STATE.md` is
written. If two items at the same priority arise in the same
cycle, the one with the earlier source-of-finding timestamp wins
(e.g., a critique log entry timestamp, a `NEED_FROM_HUMAN.md`
entry timestamp). Ties — same priority, same timestamp — are
broken by alphabetical order of the item's product/topic slug,
so the order is fully deterministic and resumable across
sessions.

**The standing META-audit (5.7.8 in `CLAUDE.md`):** the Ambition
Critic and Research Quality Critic examine the META loop's
5.7.7 pass each cycle. Their findings are themselves queue
items at priority 3 (lapsed-maximization restoration) if they
judge the audit insufficient.

---

## Cadences (the heartbeat)

These run **on schedule**, not best-effort. Missing a cadence
triggers the lapse-restore rule above (priority 3).

| Cadence target | Frequency | Reference |
|---|---|---|
| Full critique panel on every shipped product | Monthly minimum, per product | 5.7.1 |
| Escalating second-pass after any clean critique | Same cycle as the clean pass | 5.7.2 |
| Roster growth audit | Every cycle (any miss → strengthen or add) | 5.7.3 |
| "Nothing is ever done" re-opening review per shipped product | Monthly minimum, per product | 5.7.4 |
| Continuous bug-hunt (new inputs, no code change) | Weekly minimum, per shipped product | 5.7.5 |
| Continuous ideation logging | Every loop, ambient | 5.7.6 |
| META-loop audit of 5.7.1–5.7.6 | Every cycle | 5.7.7 |
| Brain integrity check | Every session start | PART 2.4 |
| Research-loop refresh of `MARKET_SIGNALS.md` | Every session | PART 4.4 |
| Re-rank of `IDEA_BACKLOG.md` | Whenever any rank-input changes | PART 3.4 |
| Spend-cap monthly reset | Calendar month, UTC | `SPEND_CAP.md` |

---

## The "queue feels empty" rule (5.7-aligned)

If the factory ever believes the prioritized queue is genuinely
empty, that belief is **itself a finding to attack**. Before
ending the session, the factory must:

1. Run a fresh portfolio-wide critique pass — does the panel
   actually return clean on every product, on a hard pass?
2. Run a fresh ideation pass — has every product produced a
   "what would make this materially better" answer? Has the
   WISHLIST been audited for new entries?
3. Run a fresh research cycle — `MARKET_SIGNALS.md` refreshed?
   New buyer classes considered? New platforms? Adjacent
   under-served niches explored?
4. Run a fresh META audit — is there anything in
   `SELF_IMPROVEMENT.md` that can be worked on? Is there a
   playbook to extract? Is the critique roster up to date?

If after all of that the queue is still empty, the factory logs
the anomaly to `META_LESSONS.md` as something to investigate, and
only then ends the session. The default stance is that a real
queue is **never empty** — and a session that thinks it is
empty is more likely to have a tired operator than a finished
factory.

---

## Continuous self-audit while building (not only after)

The factory does **not** wait for a "critique phase" to find
issues with its own work. While building anything — code, brain
files, governance documents, the factory itself — the operator
maintains a continuous internal critique stance: noticing
unclear naming, missing handling, weak microcopy, drift between
related files, ideas not captured, opportunities not pursued.
Findings flow into the appropriate brain file or critique log
the moment they surface. The formal panel run at phase end is
the *audit* of this continuous-critique habit, not its
replacement.

This rule is reinforced explicitly in `CLAUDE.md` Section 4 and
in the Maintainability Critic's checklist.

---

## Curiosity and innovation as a standing instruction

The factory is expected to be **actively curious and innovative**
about what it could be building, what infrastructure could
exist, what new buyer classes are emerging, what is genuinely
novel. Picking the safest item off a list is **not** what the
spec asks for. The PLAY loop, the WISHLIST, the derivative-
reasoning idea source, and the META loop all exist to produce
**original** thinking.

A session in which no new genuinely-novel idea was considered,
no underexplored niche was investigated, and no surprising
question was asked is a session running below its potential.
The META loop notices this and flags it.

---

## Checkpoint discipline (PART 8.4 / 8.5.4)

Every completed unit of work is committed and pushed
immediately. If a push fails:

1. Retry with a short backoff (network blips).
2. Try alternative push paths: `git push origin <branch>`,
   `git push -u origin <branch>`, push to a separate temporary
   branch, etc.
3. If all push paths fail, commit locally, log to
   `brain/META_LESSONS.md`, and continue work. Never halt on a
   push failure.

`brain/STATE.md` is updated continuously. A session never ends
without a clean brain and a pushed (or committed-and-logged) repo.

---

## Session-end sequence

When a real limit is reached:

1. Commit and push the current unit of work.
2. Consolidate the brain. `STATE.md` must record the exact next
   action AND a `Session-end reason` line of one of:
   - **spend-cap-reached** — note the remaining budget,
     the operation that would have exceeded it, and the
     exact resumption point.
   - **platform-duration-limit** — note that the platform
     ended the run and what was in flight when it did
     (so the next session can detect mid-task interruption).
   - **schedule-window-closed** — the routine's scheduled
     window ended; normal end. Mark session complete.
   `PORTFOLIO.md` current; `DECISIONS.md` has every decision
   from this session.
3. If Saturday, write `human/WEEKLY_DIGEST.md` (including the
   roster-growth and maximization-audit sections — see the
   template at `human/WEEKLY_DIGEST.md`).
4. Append a one-line entry to `ops/session-logs/YYYY-MM-DD.md`
   summarizing: duration, budget burn, units of work completed,
   queue handoff state, session-end reason.
5. Final commit + push to the canonical branch (`main`).
6. Exit cleanly.

The next session starts from a clean handoff.

## SELF_IMPROVEMENT priority (META loop)

The META loop sits at priority 8 in the queue above, which can
defer it if earlier priorities consume the cycle. To prevent
META work from accumulating indefinitely:

- An item in `brain/SELF_IMPROVEMENT.md` whose status remains
  `proposed` for **more than one full cycle** is promoted to
  priority 5 (the active-build slot, but as META work) on the
  third cycle. Standing PART 11 instructions in
  `SELF_IMPROVEMENT.md` are always queue items, never deferred
  indefinitely.
- The META-loop self-audit (5.7.7 + 5.7.8) is **never**
  deferred. It runs every cycle, regardless of queue pressure.

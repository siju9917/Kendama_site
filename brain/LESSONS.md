# LESSONS.md — post-mortems

> Every shipped product, every killed product, every critique that
> caught something important generates a lesson. Future builds
> consult this before they begin.

Format per lesson:

```
## YYYY-MM-DD — <short title>

**Context:** product / situation.
**What happened:** the actual event.
**Root cause:** the underlying reason.
**Lesson:** the rule going forward.
**Where applied:** which playbook / critic / brain file is
strengthened in response.
```

---

## 2026-05-27 — Critique fatigue is the failure mode the factory must defeat

**Context:** Bootstrap; carries forward the human's explicit
directive from the conversation that produced BidDiff's polish.

**What happened:** Earlier in the BidDiff work, the operator
declared the product "done" prematurely after several critique
passes. The human's response was unambiguous: "the infinite
iteration needs to be robust, and cannot fatigue and say 'yep
everything's good' and depend on me the human to ask for a new
critique to find issues. It should be willing to work for
literally infinite iterations, infinite time, until things are
perfect." When the operator was made to run another critique
pass, ~15 additional real bugs surfaced.

**Root cause:** The operator treated "panel returned clean" as
"work is done." It is not. A clean panel is a *hypothesis* to be
attacked, not a result to be trusted.

**Lesson:** Codified as the Section 5.7 maximization rules in
`CLAUDE.md` and `governance/CRITIQUE_AGENTS.md`. Specifically:
- **5.7.2 (escalating critique):** any clean pass triggers a
  harder second pass with adversarial inputs and the explicit
  assumption that something was missed.
- **5.7.1 (mandatory cadence):** every shipped product gets a
  full re-critique on a fixed cadence, not best-effort.
- **5.7.3 (roster growth):** every miss strengthens the roster.
- **5.7.7 (audit the maximization):** the META loop verifies
  these rules are actually being run every cycle. Lapses are P0.

The factory's stance is now permanent: critique fatigue is the
single greatest existential risk to the quality standard. The
operator may not declare "done" because it has run out of
findings; it may declare a phase closed only because a fresh hard
pass found nothing AND the next-cadence pass and the bug-hunt
pass and the "nothing is ever done" review will run regardless.

**Where applied:** `CLAUDE.md` (Section 5.7 enforcement);
`governance/CRITIQUE_AGENTS.md` (cadence, escalation, roster
growth); `governance/QUALITY_BAR.md` (escalation rule);
`governance/GUARDRAILS.md` (item 16, "no 'we're done' before
the limits hit").

## 2026-05-30 — A "no new findings" critic note hid 5 real bugs; recurring archetypes

**Context:** BidDiff, Phase K1. The K1 pass-1 log recorded that the
Correctness, Adversarial, and Security critics "re-ran against the
codebase the prior loose process had already exhaustively iterated;
they returned no new findings." Per 5.7.2 that was treated as a
hypothesis to attack.

**What happened:** A systematic adversarial sweep of the whole
codebase (5 bug-hunt passes) found **5 genuine bugs** that the
"exhaustively iterated, no findings" code still contained:

1. **Over-normalization hid a real change** — `isReformattingOnly`
   stripped decimal points, so `$1.5M`→`$15M` was suppressed as
   "reformatting." (P1; the product's worst failure class.)
2. **A per-dimension cap on an O(n²)-space algorithm** allowed a
   ~400 MB allocation (token LCS).
3. **A recognized-but-unsupported input** (`.txt`) was routed to the
   wrong extractor instead of rejected at the trust boundary.
4. **A cancellation race** — a late `setState` after an aborted async
   action (the save window) clobbered the user's action.
5. **A hash that delivered half its advertised entropy** — a "salted"
   second pass that re-hashed the identical input (32-bit, not 64).

**Root cause:** Two things. (a) The prior loose process's "no
findings" was a tired-operator conclusion, not a proof — exactly the
critique-fatigue archetype. (b) Bugs cluster at *boundaries and
invariants that look done*: normalization (what counts as "the
same"), resource caps (the metric you bound vs. the one that hurts),
trust boundaries (recognized ≠ supported), async cancellation (every
await, not just the first), and "self-evidently correct" primitives
(a hash, a comment that lies about its own code).

**Lesson:** When a critic note says "no new findings," that is the
*start* of the hard pass, never the end (5.7.2). And when hunting,
go to the invariants that *look* settled — the five archetypes above
are now Correctness/Reliability/Performance checklist items
(`governance/CRITIQUE_AGENTS.md` roster-growth log, 2026-05-30) so
the panel pre-empts them on the next product. The first product's
bug archetypes are the second product's checklist.

**Where applied:** `governance/CRITIQUE_AGENTS.md` (Correctness #1
×2, Performance #6, Reliability #7 ×2 checklist additions);
`products/biddiff/CRITIQUE_LOG.md` (bug-hunt passes 1-5); future
BidDiff playbook (`SELF_IMPROVEMENT.md` #5) will carry these as a
"diff/extraction pipeline" bug-class checklist.

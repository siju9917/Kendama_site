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

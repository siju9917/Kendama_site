# META_LESSONS.md — post-mortems about the factory's own operation

> Post-mortems specifically about the factory's *operation*: every
> escaped bug, every loop inefficiency, every brain-drift incident,
> every cap-ended session, every roster-growth lapse — and what
> structural change prevents a recurrence.
>
> This file is distinct from `brain/LESSONS.md` (which is about
> products). Together they form the factory's reflective memory.

Format per entry:

```
## YYYY-MM-DD — <short title>

**Operational event:** what happened.
**Why it happened:** root cause in the factory's structure.
**Structural fix:** what is changed in the factory itself.
**Where applied:** brain / loop / critic / governance / ops.
**Recurrence test:** how the factory verifies the fix held.
```

---

## 2026-05-27 — Bootstrap; no operational events yet to post-mortem

Empty at bootstrap. The first entries will land as the factory
operates — almost certainly with monthly burn analysis from
`governance/SPEND_CAP.md`, with re-critique-cadence audits from
the META loop, and with the first roster-growth event when the
critique system catches an issue the founding roster nearly
missed.

---

## Standing META-loop audit items

Every cycle, the META loop verifies (and writes a brief entry
here if any of the following has lapsed):

- **Re-critique cadence (5.7.1):** every shipped product was
  re-critiqued within its window.
- **Escalating critique (5.7.2):** every clean pass triggered a
  hard second pass.
- **Roster growth (5.7.3):** the critique roster grew or
  strengthened during the period.
- **"Nothing is ever done" (5.7.4):** the re-opening review ran
  on its cadence for every shipped product.
- **Continuous bug-hunt (5.7.5):** new adversarial inputs were
  tried against shipped products independent of code changes.
- **Continuous ideation (5.7.6):** the brain shows new ideation
  captured during non-research loops.
- **Brain integrity:** `STATE.md` matches `PORTFOLIO.md` matches
  `STATUS.md` for every product.
- **Spend trajectory:** burn rate vs. cap; ratio of productive
  to overhead spend.

Lapses become P0 tasks per PART 4.6 #3.

---

## 2026-05-27 — First META self-audit; new critics validated on first invocation

**Operational event:** Two new critics (Ambition #13, Research
Quality #14) were added during the bootstrap self-audit. Their
first formal invocation on BidDiff each produced a substantive
P1 finding (audience-vs-scope mismatch; no market evidence).
The parallel META self-audit on Kendama infrastructure produced
1 P0 + 5 P1 + 4 P2 findings; all P0/P1s fixed in the same
session.

**Why it happened:** "Audit yourself as you build" was the
right call — adding critics for the conservative-middle and
shallow-research failure modes *before* the first cycle meant
the first cycle exercised them and validated the design.

**Structural fix:** None beyond what was added. The roster
grew (5.7.3); the audit table in `human/WEEKLY_DIGEST.md`
records the change.

**Where applied:** `governance/CRITIQUE_AGENTS.md`,
`human/WEEKLY_DIGEST.md`.

**Recurrence test:** The META loop verifies on every cycle
that at least one critic strengthened or a new critic was
added (5.7.3) and that the new critics #13/#14 actually run.

---

## 2026-05-27 — 5.7.8 (audit-the-auditor) applied to this cycle's META audit

**Operational event:** Applied the just-established 5.7.8 rule
to the META audit performed in this same session. Adopting the
Ambition Critic and Research Quality Critic mandates, I
re-read the META findings and asked:

1. **Was the audit shallow?** Coverage against the prompt:
   recursion/audit-of-the-audit ✓, spend-cap unset ✓, branch
   state ✓, Sunday vs Routine ✓, loop interleaving ✓, roster
   lapse ✓, GitHub-Actions scope ✓, cadence enforcement ✓,
   SELF_IMPROVEMENT ranking ✓, session-end ✓. Ten distinct
   surfaces audited; not shallow.
2. **Was any obvious lapse missed?** Yes — **one new
   finding raised by this 5.7.8 pass:** there is no automated
   check that `CLAUDE.md`'s 5.7 maximization rules and
   `governance/CRITIQUE_AGENTS.md`'s cadence table stay in
   sync. A future session could edit one without the other and
   create a silent drift. **Queued to
   `brain/SELF_IMPROVEMENT.md`:** write a parser that asserts
   every 5.7.N rule has a matching cadence row, and every
   cadence row maps to a rule. Severity P2, but real.
3. **Was the conclusion defended with evidence?** Yes —
   every finding had a concrete area and a specific fix.

**Result of 5.7.8 pass:** the original META audit was
adequately rigorous; one additional finding surfaced from this
adversarial re-read. The new finding is logged per the rule.

**Where applied:** `brain/SELF_IMPROVEMENT.md` (new
"rule-cadence consistency check" item to be added).

**Recurrence test:** Every cycle's META audit gets a 5.7.8
pass of the same shape; any cycle where 5.7.8 raises zero new
findings is itself examined for whether 5.7.8 was run
seriously.

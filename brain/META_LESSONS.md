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

---

## 2026-05-30 — Cycle META audit (5.7.7) + audit-of-the-auditor (5.7.8)

**Operational event:** Saturday session, manually invoked (the
Routine still does not exist — `human/NEED_FROM_HUMAN.md` item 2).
The spend cap is still unset (`governance/SPEND_CAP.md`), so per the
unset-cap rule the session ran zero-cost work only: no sub-agent
fan-out, no web research. Top-of-queue P1 items (BidDiff market
research, rank-1 deep eval) require live web research and stayed
blocked. The session worked the unblocked queue.

**5.7.7 — did the maximization rules hold this cycle?**

- **5.7.1 (monthly re-critique per shipped product):** N/A — zero
  shipped products. Not lapsed.
- **5.7.2 (escalating critique):** HELD. The K1 pass-1 note that the
  Correctness/Adversarial/Security critics "returned no new findings"
  was explicitly treated as a hypothesis to attack, not a result to
  trust. Two hard adversarial bug-hunt passes on the diff core
  followed; both found real defects (suppress P1, token-LCS P2).
- **5.7.3 (roster growth):** HELD. Two critic checklists strengthened
  (Correctness #1, Performance #6), both in the roster-growth table.
- **5.7.4 ("nothing is ever done"):** N/A for shipped products; spirit
  applied — challenged "K1 is as critiqued as it gets" and it wasn't.
- **5.7.5 (continuous bug-hunt, new inputs):** HELD. New adversarial
  inputs invented (numeric-value reformatting; ~10k-token blocks).
- **5.7.6 (continuous ideation):** PARTIALLY HELD — flagged. Ambient
  findings were logged (3 extraction-coverage observations in
  `products/biddiff/PROGRESS.md`; the `ops/checks/` roster-growth
  idea). But no genuinely *new product* idea was generated this
  cycle, because the cap blocked the research/ideation-heavy work.
  Honest call: ideation ran below potential. Mitigation is the same
  as the binding constraint — the cap (NEED_FROM_HUMAN item 1).
- **Brain integrity:** HELD and now automated (`ops/checks/`).
- **Spend trajectory:** N/A — cap unset, zero spend.

**Closed loop worth noting:** last cycle's 5.7.8 pass produced the
"rule/cadence consistency check" SELF_IMPROVEMENT item (#6). This
cycle implemented it as the `ops/checks/` infrastructure (#6 + #7
both done). The audit-of-the-auditor produced a concrete capability
one cycle later — evidence the recursion is load-bearing, not
ceremonial.

**5.7.8 — audit-of-the-auditor (Ambition #13 + Research Quality #14
examine this 5.7.7 pass):**

1. **Was the audit shallow?** Eight rules + brain integrity + spend
   each addressed with a held/lapsed verdict and evidence. Not
   shallow.
2. **Was an obvious lapse missed / conclusion asserted not defended?**
   One real finding from this adversarial re-read: **the maximization
   audit has been "passing" largely because the binding constraint
   (unset cap) keeps the factory on a narrow zero-cost slice where
   most rules are N/A (no shipped products) — the rules are not being
   *exercised at full surface*, they're being satisfied on a
   technicality.** That is itself a flag: the factory has now run two
   sessions without the cap set, has a near-ship product that cannot
   ship (research-gated), and a backlog that cannot advance
   (research-gated). The single highest-leverage action in the whole
   system is the human setting the spend cap. This is already logged,
   but the META audit should escalate its visibility — done below.
3. **Ambition check:** the cycle was bug-fix + infra heavy (safe,
   high-value) and ideation-light. Acknowledged in 5.7.6 above; the
   cause is the cap, not operator conservatism — the research/PLAY
   surface is exactly what the cap blocks.

**Escalation from 5.7.8:** raise the spend-cap blocker to the top of
the weekly digest's "needs human" section with the explicit framing
that *two* consecutive sessions have now been constrained by it and
the near-ship product is stuck behind it. No new guardrail or rule
change — the escalation is informational, to the human.

**Where applied:** `human/WEEKLY_DIGEST.md` (escalated framing),
`brain/STATE.md` (cycle recorded).

**Recurrence test:** next cycle's 5.7.7 checks whether the cap was
set; if still unset after this escalation, the META loop logs the
consecutive-constrained-session count and asks whether the factory's
zero-cost queue is being exhausted (a different, harder question).

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

# RANKING.md — the current master ranking and its reasoning

> The order in `brain/IDEA_BACKLOG.md` plus the **reasoning** for
> that order. A future session reads this to understand WHY the
> current top-of-stack is the current top-of-stack — never just the
> rank number.

The scoring model is in `governance/SCORING_MODEL.md`. The
re-ranking cadence is in PART 3.4 of the founding spec.

---

## Current master ranking (2026-05-27, bootstrap)

### Above all candidates: the active product

**BidDiff** is the active product, in `build` status, mid-critique.
It is not in the candidate ranking; the BUILD loop is already
working it. The next BUILD-loop selection happens only after
BidDiff ships.

### Candidate ranking (deep evaluations not yet done)

The ranking below is the **provisional** ranking inherited from the
prior research the human passed in. It will be re-ordered as deep
evaluations land.

1. **JetBrains / Salesforce Apex plugin** — top, provisional.
   Reasoning: passes every hard filter (distribution via JetBrains
   Marketplace, self-serve monetization through JetBrains' own
   billing, build feasibility for a single autonomous agent —
   JetBrains plugin SDK is well-documented, scope is narrow). The
   Apex developer niche has documented pain and budget. Evidence
   tier: Proven; comparable paid IntelliJ plugins for niche
   languages exist and earn real revenue. Pending deep evaluation
   to validate the specific Apex sub-problem to solve.

2. **FAR/DFARS clause-currency MCP server** — second, provisional.
   Reasoning: distribution via the new MCP server registry is real
   but still emerging (signal: the MCP ecosystem is being adopted
   inside Claude Code, Cursor, and other agent runtimes). The
   buyer is anyone building automation on federal procurement —
   the same audience BidDiff serves. There is direct compounding
   with BidDiff's clause dataset (Kendama can pull from the same
   curated source). Evidence tier: Plausible; the MCP marketplace
   is too new to claim Proven. Higher upside than rank suggests,
   but evidence quality docks the score.

3. _(Further prior-research ideas to be reconstructed and ranked.)_

### Provisional, not final

This ranking is **provisional** because no candidate has yet
received a full deep evaluation per Section 3.3. The first
session-after-bootstrap deep-evaluates rank 1; on completion the
ranking may shift. The factory does not build from a provisional
ranking — it builds from an approved ranking.

---

## Re-rank history

| Date | Triggering event | Change | Reasoning |
|---|---|---|---|
| 2026-05-27 | Bootstrap | Provisional rank seeded | Carried forward from prior human research. Not final until deep evaluations land. |

---

## Notes for the META loop

- The provisional ranking is essentially a hand-off from the prior
  research. The META loop's first audit task includes verifying
  that the scoring weights in `governance/SCORING_MODEL.md` would
  produce this ordering if the candidates were fully evaluated —
  and flagging discrepancies.
- Once deep evaluations exist, the ranking is the strict sort by
  total score with the evidence-tier portfolio rule applied
  (PART 3.5: portfolio stays majority-Proven).

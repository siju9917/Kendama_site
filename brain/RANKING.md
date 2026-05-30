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

3. **Derivative-reasoning family (D1–D5) — added 2026-05-30 by
   first-principles ideation.** See `brain/IDEA_BACKLOG.md`
   "Derivative-reasoning candidates." The unifying insight:
   BidDiff's reusable competency is *critical-change diffing of
   structured documents*, a horizontal capability. Provisional
   placement within the candidate set:
   - **D1 (`regdiff` library) and D2 (`clauseguard` GitHub app)**
     rank just below the FAR/DFARS MCP server (rank 2) on strategic
     fit — both directly compound BidDiff's engine + clause dataset
     and have real marketplace/registry distribution. D2's GitHub
     Marketplace distribution is stronger buy-intent than D1's npm
     SEO, so D2 ≳ D1 provisionally.
   - **D4 (Shopify theme-risk app)** has the highest revenue ceiling
     of the family (Proven Shopify-app revenue category) but the
     weakest strategic fit and worst maintenance fit (hosting + API
     churn) — a higher-variance bet.
   - **D3 (protobuf JetBrains plugin) and D5 (OpenAPI VS Code
     extension)** are "Proven-leaning" because incumbents
     (buf.build, oasdiff) prove the pain, but they compete against
     those incumbents — wedge is IDE-native immediacy.
   None is approved or deep-evaluated; the cited deep-evaluation is
   the cap-gated step. They are ranked here from first principles so
   the BUILD loop has a real, reasoned candidate set the moment the
   cap unblocks evaluation.

4. _(Further prior-research ideas to be reconstructed and ranked —
   SELF_IMPROVEMENT #1, still pending the prior-research source.)_

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
| 2026-05-30 | New ideas added (first-principles ideation) | Added derivative-reasoning family D1–D5 | "Critical-change diff" recognized as a horizontal capability; 5 concrete candidates across npm/GitHub/JetBrains/Shopify/VS Code surfaces, provisionally ranked by strategic fit × distribution × evidence. Cited deep-eval still cap-gated. |

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

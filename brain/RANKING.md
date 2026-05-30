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

### Holistic synthesis (2026-05-30) — recommended deep-eval order

After first-principles scaffolding of all 5 seeded candidates +
D1–D5, applying the `SCORING_MODEL.md` hard filters
(distribution-without-marketing, self-serve, Proven evidence,
agent-buildable) and the portfolio-sequencing insight. This is the
order the **cap-unblocked** session should deep-evaluate (cited
research), picking the first that confirms Proven + a clear
marketplace + (for plugins) a chosen sub-feature:

1. **Rank-1 JetBrains Apex plugin** — Proven-leaning, marketplace
   distribution + self-serve billing, narrow scope. *Gate:* must pick
   and defend a specific sub-feature (not "an Apex plugin"); assess
   agent Apex-domain fluency. Still the lead.
2. **D2 `clauseguard` (GitHub Marketplace app)** — Plausible,
   GitHub-Marketplace buy-intent distribution, strategic-fit 9
   (reuses BidDiff's clause dataset + engine). Strong second.
3. **D4 Shopify theme-risk app** — highest revenue ceiling (a Proven
   Shopify-app category) + strong marketplace, but weakest strategic
   fit + worst maintenance-fit. A higher-variance revenue bet.
4. **D3 protobuf JetBrains / D5 OpenAPI VS Code** — Proven-leaning
   (incumbents buf.build / oasdiff prove the pain), marketplace
   distribution, but compete with those incumbents; wedge = IDE-native.
5. **Rank-2 FAR/DFARS MCP server** — strategic-fit 9, but *emerging*
   (unproven) MCP distribution — evidence risk dominates.

**Build as byproducts / infrastructure, NOT lead products** (per the
portfolio-sequencing insight): rank-3 (PDF extractor), rank-5 / D1
(the rule-pack loader / `regdiff` engine library). **Companion, not
standalone:** rank-4 (SAM feed — fails the distribution hard filter
as a SaaS).

**Portfolio rule check:** the lead slate must stay majority-Proven
(`SCORING_MODEL.md` PART 3.5). Rank-1, D3, D4, D5 are the
Proven-leaning anchors; rank-2 + the speculative infra are a deliberate
minority. No candidate is approved — all await the cited deep-eval +
`human/APPROVALS.md`.

---

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
| 2026-05-30 | All 5 seeded candidates scaffolded + holistic synthesis | Produced the recommended deep-eval order (rank-1, D2, D4, D3/D5, rank-2) + reclassified rank-3/5/D1 as byproduct-infra and rank-4 as companion | First-principles hard-filter analysis: rank-4 fails distribution-without-marketing; rank-3/5/D1 are infrastructure not lead products; the marketplace + Proven-leaning candidates lead. Cited research still cap-gated. |

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

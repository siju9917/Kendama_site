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

### First-principles provisional sub-scores (2026-05-30 evening) — cap-INDEPENDENT

The cited revenue/evidence research is cap-gated, but the SCORING_MODEL's
*structural* factors (distribution, maintenance, build feasibility, self-serve,
defensibility, strategic fit) can be scored now from first principles. These
are provisional and will be revised by the cited deep-eval; revenue/probability
columns are left as ranges pending research and excluded from the partial total.
Scored 0–10 per the model; the partial weighted total uses ONLY the
cap-independent factors (Dist 14, Maint 10, Build 10, Self-serve 8, Defens 8,
Strategic 8 = 58 of the 100 weight) so candidates are comparable today on what
we can defensibly assess. The on-device-trust wedge (see IDEA_BACKLOG) is
reflected in Distribution for the security-review-gated candidates.

| Candidate | Dist (×14) | Maint (×10) | Build (×10) | Self-serve (×8) | Defens (×8) | Strategic (×8) | Partial /580 | Hard-filter notes |
|---|--:|--:|--:|--:|--:|--:|--:|---|
| **Rank-1 Apex (JetBrains)** | 9 | 9 | 6 | 10 | 6 | 7 | **460** | passes all filters; build feasibility docked (Apex-domain fluency unproven) |
| **D2 clauseguard (GitHub app)** | 9 | 6 | 8 | 9 | 8 | 9 | **474** (partial) → **556/1000 full** (2026-06-06) | CONDITIONAL DEFER; pain density unvalidated; rev ceiling $3K–$10K MRR; Filter 1 conditional |
| **D4 Shopify theme-risk** | 9 | 5 | 7 | 10 | 5 | 6 | **414** | highest rev ceiling but server-side (no on-device wedge); API-version churn |
| **D3 protobuf (JetBrains)** | 8 | 9 | 7 | 10 | 5 | 7 | **448** | Buf is a strong incumbent (defensibility docked); IDE-native wedge |
| **D5 OpenAPI (VS Code)** | 9 | 9 | 7 | 5 | 5 | 7 | **422** | VS Code has no built-in billing (self-serve docked → DIY license server) |
| **Rank-2 FAR/DFARS MCP** | 6 | 8 | 8 | 7 | 8 | 9 | **436** | MCP distribution emerging/unproven (Dist docked hard); strong strategic fit |

**Reading (cap-independent only):** on the structural factors alone, **D2
clauseguard** leads (474/580) — strong distribution + the clause-data/on-device
moat + highest strategic fit — over **rank-1 Apex** (460) and **D3
protobuf** (448). (Sub-scores verified arithmetically against the model
weights Dist14/Maint10/Build10/Self8/Defens8/Strategic8.) This does NOT override the recommended deep-eval order below,
because the *missing* columns (revenue ceiling 18, probability 14, evidence 10
= 42 of 100 weight) are exactly where rank-1's "Proven" tier and Apex's
documented paid-plugin market are expected to pull it up. The honest takeaway:
**D2 and rank-1 are effectively co-leads pending the cited evidence** — D2 on
structure, rank-1 on proven-revenue — which is why both sit at the top of the
deep-eval order. D4's high revenue ceiling must overcome its weak structure +
no on-device wedge to win.

### Holistic synthesis (2026-05-30) — recommended deep-eval order

After first-principles scaffolding of all 5 seeded candidates +
D1–D5, applying the `SCORING_MODEL.md` hard filters
(distribution-without-marketing, self-serve, Proven evidence,
agent-buildable) and the portfolio-sequencing insight. This is the
order the **cap-unblocked** session should deep-evaluate (cited
research), picking the first that confirms Proven + a clear
marketplace + (for plugins) a chosen sub-feature:

1. ~~**Rank-1 JetBrains Apex plugin**~~ **EVALUATE-TO-REJECT (2026-06-06).** Score 508/1000.
   TAM too small, Kotlin build risk, VS Code winning.
2. ~~**D2 `clauseguard` (GitHub Marketplace app)**~~ **CONDITIONAL DEFER (2026-06-06).** Score 556/1000.
   Pain density unvalidated; revenue ceiling $3K–$10K MRR; Filter 1 conditional only.
3. **VS Code Breaking-Change Lens (D5/OpenAPI beachhead)** — **CONDITIONAL PROCEED (2026-06-06).**
   Full cited score: **636/1000 (6.36)** — first candidate to clear the 600 threshold.
   Deep evaluation: `brain/RESEARCH/2026-06-06-vscode-breaking-change-lens.md`.
   Beachhead: **OpenAPI** (oasdiff has no VS Code extension; the slot is open).
   TypeScript/VS Code extension, fully on-device, VS Code Marketplace organic discovery.
   Revenue ceiling realistic 2-year: $3.5K–$10K MRR. Proposal #3 posted to APPROVALS.md.
   Auto-proceeds PROCEED 2026-06-13 if no human response.
   **NOTE:** D3 (protobuf/gRPC JetBrains) and D6 (terraform plan classifier, VS Code)
   are on-device candidates NOT yet deeply evaluated; first-principles partial scores
   suggest D3 could reach 700+ on the JetBrains Proven-payment channel. Evaluate these
   before or concurrently with VS Code lens Phase 0 to confirm the ranking is correct.
   Deep evals kicked off 2026-06-06.
4. ~~**D4 Shopify theme-risk app**~~ **DROPPED (2026-06-01 filter re-ordering).**
   Server-side (hosting required) = zero-opex Filter 1 violation per
   `governance/PRODUCT_CONSTRAINTS.md`. Retained in IDEA_BACKLOG as a future
   candidate if a redesign makes it on-device or the filter is relaxed.
   Note: RANKING.md previously listed D4 as #4 (a brain drift vs IDEA_BACKLOG's
   2026-06-01 re-filter note); corrected 2026-06-06.
5. ~~**D3 protobuf/gRPC JetBrains plugin**~~ **CONDITIONAL DEFER (2026-06-06).** Score 580/1000.
   Deep evaluation: `brain/RESEARCH/2026-06-06-protobuf-grpc-jetbrains-plugin.md`.
   **Decisive finding:** Buf Technologies already ships a free JetBrains plugin
   (`intellij-buf`, plugin ID 19147, last release April 2026) with `buf breaking`
   integration, backed by $93M funding and $5.4M ARR. Defensibility 3/10 (competing
   against a well-funded free incumbent); probability 4/10. Score 580/1000 < 600 threshold.
   Revisit only after D5 ships and if buf's JetBrains plugin stagnates.
6. **D6 terraform plan destructive-change classifier (VS Code)** — **CONDITIONAL PROCEED (2026-06-06).**
   Full cited score: **641/1000** — clears the 600 threshold; SLIGHTLY OUTSCORES D5 (636).
   Deep evaluation: `brain/RESEARCH/2026-06-06-terraform-plan-classifier.md`.
   **Decisive evidence:** Infracost ($17M+ revenue, $15M Series A Nov 2025) proves the
   plan-annotation-in-IDE category is fundable. On-device gap confirmed: zero VS Code
   extensions do blast-radius classification on plan JSON (TerraScope, Scalr ext, and
   HashiCorp official all verified — none does inline CRITICAL/NORMAL classification).
   Plan JSON schema stable since Terraform 0.12 with formal backward-compat guarantee.
   **Sequencing:** Build AFTER D5 (VS Code lens) — D5 provides the extension scaffold
   D6 reuses. These are TWO products on the same platform, not competing alternatives.
7. **Rank-2 FAR/DFARS MCP server** — strategic-fit 9, but *emerging*
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

**First-product sequencing under execution risk (2026-05-31,
cap-independent).** The ranking above optimizes per-product expected value,
but the FIRST product to ship is a different decision than the highest-EV
product, and the difference is cap-INDEPENDENT: (1) the factory has *zero*
shipped products, so the first ship's dominant value is de-risking and
learning the full ship pipeline (store submission, payments, support, update
cadence) — a benefit that accrues regardless of which product goes first;
(2) **D2 clauseguard's lead rests on certainty the factory already holds** —
it reuses BidDiff's *built and test-validated* rule-pack-swap engine
(`engine-domain-agnostic.test.ts`) and clause data, so its build risk is
low and known; **rank-1 Apex's higher rank rests on two things the factory
does NOT yet hold** — cap-gated Proven-revenue evidence AND an *unproven*
assumption about agent Apex-domain fluency (the table docks its build
feasibility to 6 for exactly this). A risk-adjusted first-product choice
therefore tilts toward **D2 as the first ship** even if Apex retains the
higher raw EV — you ship the high-reuse/low-unknown product first, bank the
pipeline learning, and let the cited Apex deep-eval mature in parallel. This
is a sequencing argument, NOT a re-rank: it does not change the deep-eval
order (which is cap-gated work anyway), but the cited deep-eval should weigh
it explicitly rather than default to "highest EV ships first."

---

The ranking below was provisional at bootstrap. **Deep evaluations are now
landing (2026-06-06) and the ranking is being revised with cited evidence.**

1. **JetBrains / Salesforce Apex plugin** — ~~top, provisional~~ **EVALUATE-TO-REJECT (2026-06-06).**
   Deep evaluation complete: `brain/RESEARCH/2026-05-27-jetbrains-apex-plugin.md`.
   Full score: **508/1000 (5.08)** — below the 6.0 auto-proceed threshold.
   Proposal #2 posted to `human/APPROVALS.md` with recommendation to REJECT.
   Reasons: (a) TAM too small (~5,000–7,000 JetBrains Apex users; ceiling ~$100K ARR net);
   (b) Build requires Kotlin — new stack for a TypeScript factory, high quality risk;
   (c) ApexGuru via MCP (2026-04) is already closing the gap;
   (d) VS Code is winning (75.1% share vs JetBrains 7.1% and declining);
   (e) Evidence tier downgraded to PLAUSIBLE (no Proven comparable revenue found).
   Auto-proceeds to REJECT 2026-06-13 if no human response.
   **The SEQUENCING NOTE (above) was correct in hindsight** — the risk on rank-1
   was real and materialized exactly as flagged: agent Apex-domain fluency +
   unknown Kotlin build feasibility were the deciding factors against it.

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
   **D2 clauseguard deep evaluation complete 2026-06-06: 556/1000, CONDITIONAL DEFER**
   (see `brain/RESEARCH/2026-06-06-clauseguard-github-app.md`). Remaining D-family
   and seeded candidates await deep evaluation; next up is VS Code Breaking-Change
   Lens (D5/D6 — best beachhead format to be determined).

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
| 2026-05-30 (evening) | Meta-synthesis: D3/D5/D6 are one product line | Collapse the per-format IDE breaking-change classifiers (protobuf/OpenAPI/terraform — and the tempting SQL/k8s/GraphQL next ones) into a single "Breaking-Change Lens" product = one engine+IDE+license shell + N parser/rule-pack plugins; rank the LINE by its best beachhead format | Resists backlog dilution (distinct file formats are not distinct products); the dev-tooling analogue of the regdiff engine+rule-pack play. Architecture decided now; beachhead format awaits the cited deep-eval. See IDEA_BACKLOG meta-synthesis. |
| 2026-05-30 (evening) | First-principles provisional sub-scores computed | Scored the 6 candidates on the 6 cap-independent SCORING_MODEL factors (partial /580): D2 clauseguard 474 ≳ rank-1 Apex 460 ≳ D3 protobuf 448 > MCP 436 > D5 422 > D4 414 | Cited revenue/probability/evidence (42 of 100 weight) still cap-gated; on structure alone D2 leads, but rank-1's expected Proven-revenue tier makes them co-leads — consistent with the deep-eval order. Arithmetic verified. |
| 2026-05-30 (evening) | "On-device trust wedge" insight (first-principles; see IDEA_BACKLOG) | Up-weight distribution sub-score for security-review-gated, on-device candidates (D1/D2/MCP); down-weight inherently server-side ones (D4, rank-4 feed); D2 ≳ D4 sharpened with a reason | BidDiff's verified fully-on-device architecture is a *distribution* asset, not just privacy: "no data leaves your machine" clears the security review that gates adoption for compliance-sensitive buyers — a self-serve trust claim that shortens the sales cycle with zero marketing spend (exactly what the hard filter rewards), and one server-side incumbents can't match. The strongest first product may be the one whose buyer's security review is *hardest*, not the highest-TAM. Cap-independent (rests on the passing on-device test); cited deep-eval should test it, not originate it. |
| 2026-05-31 | "First-product sequencing under execution risk" insight (first-principles) | Added a sequencing argument (NOT a re-rank): the FIRST product to ship should be risk-adjusted toward D2 clauseguard even if rank-1 Apex keeps the higher raw EV | With zero shipped products, the first ship's dominant value is de-risking/learning the ship pipeline (accrues regardless of product). D2's lead rests on certainty the factory ALREADY holds (the built+test-validated rule-pack-swap engine + clause data → low/known build risk); Apex's higher rank rests on cap-gated revenue evidence AND an unproven agent-Apex-domain-fluency assumption (build-feasibility docked to 6). So ship the high-reuse/low-unknown product first; let the cited Apex deep-eval mature in parallel. Cap-independent; the deep-eval should weigh it, not default to "highest EV first." |
| 2026-06-06 | D2 clauseguard deep evaluation complete (556/1000) | CONDITIONAL DEFER: not REJECT, but below build threshold | Pain density (FAR/DFARS/HIPAA clause citations in GitHub repos) is unvalidated — 60% failure mode estimate. Revenue ceiling $3K–$10K MRR realistic 2 years, below $20K+/month target. Filter 1 conditional pass only (Cloudflare Workers free tier). The first-product sequencing note was premature: D2's Filter 1 tension and pain-density unknown actually make it a riskier first ship than a VS Code extension. New next candidate: VS Code Breaking-Change Lens (D5/D6 — TypeScript, VS Code Marketplace, on-device, no Filter 1 issue, Proven-leaning). |
| 2026-06-06 | VS Code Breaking-Change Lens deep evaluation complete (636/1000) | CONDITIONAL PROCEED — first candidate to clear the 600 auto-proceed threshold | Beachhead: OpenAPI (oasdiff has no VS Code extension; gap confirmed real). Score 636: distribution 9 (VS Code Marketplace), maintenance 9 (on-device), build 8 (TypeScript), strategic 8 (BidDiff engine reuse). Drag: revenue 5 ($3.5K–$10K MRR realistic 2yr), probability 4, defensibility 4 (oasdiff can ship VS Code ext in 3–6 months). Build sequence: free OpenAPI beachhead → 1,000-install traction gate → paid Pro tier (LemonSqueezy). Proposal #3 posted to APPROVALS.md; auto-proceeds PROCEED 2026-06-13. |

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

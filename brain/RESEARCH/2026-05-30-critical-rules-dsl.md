# Deep evaluation (scaffold) — critical-change rules curation DSL

**Status:** **scaffold.** First-principles sections filled; cited
sections `[CITED — cap-gated]`. `IDEA_BACKLOG` rank 5 (WISHLIST
2026-05-27 #3), tier Speculative. Not decision-ready.

**Idea:** A structured DSL that lets *domain experts* (not TypeScript
devs) define critical-change rules — pattern-match on extracted
blocks, anchor types, clause refs, value ranges — and exports a
runtime-loadable rule set any regulated-document-diff product consumes
(federal procurement, FDA filings, securities filings, building codes).

## ⚠ First-principles finding (the decisive issue)
**This is infrastructure, not a standalone product.** It is the *rule
layer* of the D-family / `regdiff` engine. As a product it has no clear
standalone buyer: domain experts don't buy a "rules DSL"; product teams
do, and they're few. Per the portfolio-sequencing insight
(`brain/IDEA_BACKLOG.md`), this should be **built as the rule-pack
abstraction inside `regdiff`/BidDiff**, not sold on its own — and
*possibly* later exposed as an open-source spec to drive adoption of
the engine. Treating it as a lead product fails the buyer-clarity and
distribution filters.

## 1. Competitor teardown — `[CITED — cap-gated]`
Adjacent: policy-as-code / rules engines (OPA/Rego, JSON Logic),
document-comparison platforms (Litera, Draftable — closed, no rule
authoring), regtech rule platforms. The honest question the teardown
must answer: does *anyone* sell a domain-expert-authored
critical-change rule DSL, and to whom? If not, that's Speculative
confirmed.

## 2. Revenue model — `[CITED — cap-gated]`
If it exists at all as a product: open-source DSL + spec (drives engine
adoption) + paid managed rule-packs / a hosted authoring SaaS. But the
buyer count is small — this is a moat/adoption play for the engine, not
a revenue center.

## 3. Distribution — first principles
No natural marketplace. An open-source spec on GitHub/npm drives
*developer* adoption of the engine, not direct revenue. **Fails
distribution-without-marketing as a standalone product.**

## 4. Build-effort — first principles
- Designing a good DSL (expressive enough, safe to evaluate, stable) is
  real language-design work — non-trivial and easy to over-build.
- The *runtime loader* is the genuinely useful piece and is small: a
  validated schema → the same `classify`/`critical` decisions BidDiff
  hard-codes today. Building that loader *inside* BidDiff/`regdiff`
  (so rules are data, not code) is the high-value, low-risk subset.

## 5. Risk register — first principles
- **No buyer** for the DSL-as-product (the core risk).
- **Over-engineering** a DSL that no external author ever uses.
- **Safety** — evaluating user-authored rules must be sandboxed
  (no code execution from rule data).

## 6. Why this might fail (mandatory) — first principles
- **It's infrastructure mis-cast as a product.** The honest move is to
  build the *data-driven rule-pack loader* inside the engine (real,
  immediately useful for the D-family) and shelve the
  "DSL-as-sellable-product" framing unless the cited teardown finds a
  real buyer (unlikely → Speculative).
- **Speculation risk:** a deliberate Speculative bet must stay a small
  minority of capacity (`SCORING_MODEL.md` portfolio rule); this should
  not consume a build slot on its own merits.

## 7. Evidence tier — **Speculative** (confirmed by first principles)
No identifiable standalone buyer; value is as engine infrastructure.

## Provisional scoring (first principles)
| Factor | Wt | Prov. | Note |
|---|--:|--:|---|
| Revenue ceiling | 18 | 3 | no clear standalone buyer |
| Prob. of ceiling | 14 | 2 | speculative |
| Distribution quality | 14 | 3 | no marketplace; OSS-adoption only |
| Maintenance fit | 10 | 6 | a loader is light; a hosted authoring SaaS is not |
| Build feasibility | 10 | 7 | the loader subset is small; a full DSL is real work |
| Self-serve monetization | 8 | 4 | unclear what's sold |
| Defensibility | 8 | 6 | the rule corpus could be a moat |
| Evidence quality | 10 | 2 | Speculative |
| Strategic fit | 8 | **9** | it IS the rule-pack layer of the whole D-family/regdiff |

**Read:** **build the rule-pack loader as engine infrastructure; do
not pursue the DSL as a standalone product** unless the cited teardown
surprises. Highest strategic fit, lowest standalone-product viability —
exactly the "infrastructure, not a product" pattern.

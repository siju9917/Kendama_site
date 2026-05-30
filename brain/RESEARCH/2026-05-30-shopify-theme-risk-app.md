# Deep evaluation (scaffold) — Shopify theme/liquid change-risk app

**Status:** **scaffold.** First-principles sections filled; cited
sections `[CITED — cap-gated]`. `IDEA_BACKLOG` candidate **D4**; ranked
**#3** in the recommended deep-eval order (`brain/RANKING.md`). Highest
revenue ceiling of the family; weakest strategic fit. Not decision-ready.

**Idea:** A Shopify App that **diffs a store's theme/Liquid template
changes and flags risky edits before publish** — changes touching
checkout, cart, tracking pixels / web-pixels, structured data
(JSON-LD), `theme.liquid` core hooks, app-block removals — with a
"what changed that could break revenue or tracking" summary. Reuses
the critical-change-diff engine (validated horizontal) with a Shopify
"risky-edit" rule-pack.

## ⚠ First-principles caveats (decisive trade-offs)
- **+ Highest revenue ceiling:** Shopify apps are a **Proven** revenue
  category — merchants/agencies pay real MRR, and the App Store is
  strong buy-intent distribution. This is the family's best
  revenue/distribution case.
- **− Weakest strategic fit:** furthest from BidDiff's domain (the
  clause dataset doesn't transfer; only the *engine* + the
  diff/critical *pattern* reuse). The rule-pack is entirely new
  (Liquid/theme risk, not regulatory).
- **− Worst maintenance fit:** a hosted app + Shopify API-version churn
  (Shopify deprecates API versions on a schedule) = standing ops, the
  opposite of BidDiff's on-device model.

## 1. Competitor teardown — `[CITED — cap-gated]`
Shopify theme-version/backup apps, "theme inspector"/preview tools,
Git-for-Shopify-themes integrations, and Shopify's own theme version
history. The wedge: those *back up/restore*; few *classify the risk* of
a specific edit (checkout/pixel/SEO impact). Confirm that gap + size it.

## 2. Revenue model — `[CITED — cap-gated]`
Shopify App Store subscription via the Billing API (self-serve), tiered
by store plan / theme count. Comparable: disclosed MRR of theme-tooling
apps (cite App Store + public revenue posts).

## 3. Distribution — first principles
**Shopify App Store** = strong buy-intent traffic + built-in billing.
Among the family's best distribution. The risk is *category
competition* (many theme apps) — ranking/ASO matters.

## 4. Build-effort — first principles
- **Phase 1:** Shopify App (OAuth, App Bridge, billing, a hosted
  backend) + theme-asset read access.
- **Phase 2:** A Liquid/theme **risky-edit rule-pack** — the genuinely
  new work: anchors for checkout liquid, `web-pixel`/analytics, JSON-LD,
  app blocks, `theme.liquid` hooks; criticality = "could break
  conversion/tracking/SEO."
- **Phase 3:** Run the engine on theme-version pairs → risk summary;
  publish-gate UX.
- **Maintenance:** Shopify API-version upgrades on a cadence + hosting.

## 5. Risk register — first principles
- **Maintenance/ops** (hosted app + Shopify API churn) — the main drag.
- **Rule-pack is all-new** — no reuse of the federal dataset; the risk
  taxonomy must be genuinely good (a top-tier merchant would catch a
  weak one).
- **Category competition** in the App Store.
- **Platform risk:** Shopify could add this to native theme history.

## 6. Why this might fail (mandatory) — first principles
- **It's the least-compounding bet** — only the engine + pattern reuse,
  not the dataset; so it doesn't strengthen the regulatory portfolio.
  Justified only by its standalone revenue case (cited §1/§2).
- **Ops burden** conflicts with the autonomous-solo maintenance target
  more than any other candidate.
- **Risk-classification quality** is the product; if the rule-pack is
  mediocre, merchants won't trust it.

## 7. Evidence tier — provisional **Plausible→Proven-leaning**
Shopify-app revenue is Proven *as a category*; this specific niche is
Plausible pending the cited teardown.

## Provisional scoring (first principles)
| Factor | Wt | Prov. | Note |
|---|--:|--:|---|
| Revenue ceiling | 18 | **8** | Proven Shopify-app revenue category |
| Prob. of ceiling | 14 | tbd | niche-specific; §1/§2 |
| Distribution quality | 14 | **8** | App Store buy-intent + billing |
| Maintenance fit | 10 | **3** | hosted + API-version churn |
| Build feasibility | 10 | 6 | Shopify App standard; all-new rule-pack |
| Self-serve monetization | 8 | **8** | Billing API |
| Defensibility | 8 | 5 | risk-taxonomy quality; erodable by platform |
| Evidence quality | 10 | tbd | §1/§2 |
| Strategic fit | 8 | 4 | engine/pattern reuse only; dataset doesn't transfer |

**Read:** the **revenue/distribution standout** but the **least-
compounding + worst-ops** bet. Pursue only if its standalone numbers
(cited) are strong — it's a diversification play, not a portfolio-
compounding one. Deep-eval third.

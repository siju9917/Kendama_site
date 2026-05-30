# Deep evaluation (scaffold) — SAM.gov amendment monitoring feed

**Status:** **scaffold.** First-principles sections filled; cited
sections `[CITED — cap-gated]`. `IDEA_BACKLOG` rank 4 (WISHLIST
2026-05-27 #2). Not decision-ready until cited sections land.

**Idea:** Watch a set of federal solicitations; when one is amended,
push an RSS/email/Slack/webhook notification with the critical-change
summary inline (reusing BidDiff's engine + clause dataset). BidDiff
diffs two versions the user already has; this product *notices* a new
amendment exists — the implicit unmet need.

## ⚠ Hard-filter finding (first principles — the decisive issue)
`governance/SCORING_MODEL.md`'s dominant filter is
**distribution-without-marketing**. A standalone SaaS feed **fails it**
— there is no marketplace delivering buyers; it needs an audience built
from scratch (outbound, SEO, content). That is the single most likely
reason this scores low despite obvious user value. Mitigations to test
in the cited eval:
- **Deliver as a Slack app** → list in the Slack App Directory (a
  marketplace surface with some intent traffic + self-serve billing).
- **Deliver as a Chrome extension companion to BidDiff** → ride the
  Web Store + the existing product's surface (compounding, not new
  distribution).
If neither marketplace path is credible, this idea is **filtered down**
regardless of user value — and that must be stated honestly, not
wished away.

## 1. Competitor teardown — `[CITED — cap-gated]`
SAM.gov's own "follow/notification" features; GovTribe, HigherGov,
EZGovOpps, Bloomberg Government (paid market-intel incumbents);
free SAM.gov data API + opportunity webhooks. The wedge over "SAM
already emails you" is the **inline critical-change summary** (the
BidDiff engine), not the notification itself.

## 2. Revenue model — `[CITED — cap-gated]`
Per-seat or per-watched-opportunity subscription (self-serve Stripe).
Comparable: the GovCon market-intel tools above charge real money —
but they bundle far more than amendment alerts, so the price anchor
for a *focused* alert tool is unclear. Cited section must find it.

## 3. Distribution — first principles
See the hard-filter finding. The honest options are Slack App
Directory or a BidDiff companion; pure SaaS is filtered.

## 4. Build-effort — first principles
- **Phase 1:** A reliable SAM.gov opportunity-watch + amendment-detect
  pipeline (SAM.gov Beta API or a polling/scrape with change detection).
  **This is the hard, fragile part** — a data pipeline with uptime/
  monitoring needs (worse maintenance-fit than BidDiff's on-device
  model).
- **Phase 2:** Run the BidDiff engine on the new-vs-prior amendment →
  critical-change summary.
- **Phase 3:** Delivery channels (email/Slack/webhook/RSS) + self-serve
  billing.
- **Maintenance fit: low** — a hosted, always-on pipeline dependent on
  SAM.gov's surface is a standing ops burden, unlike BidDiff.

## 5. Risk register — first principles
- **Distribution (the hard filter)** — the central risk; see above.
- **SAM.gov data-source fragility** — API/format changes break ingest.
- **Maintenance burden** — always-on pipeline vs. the factory's
  "runs on a few $/mo, no daily ops" maintenance-fit target.
- **Incumbents** bundle this into broader (expensive) market-intel
  suites; a focused tool may be undercut or ignored.

## 6. Why this might fail (mandatory) — first principles
- **It fails the distribution hard filter** unless a marketplace
  delivery (Slack app / BidDiff companion) is credible. This alone can
  sink it.
- **Always-on ops** conflict with the autonomous-solo maintenance
  model — the factory prefers products that don't need a babysat
  pipeline.
- **"SAM already notifies you"** — the wedge (inline critical summary)
  must be clearly worth a subscription over free SAM follows.

## 7. Evidence tier — provisional **Plausible→weak** (distribution-gated)
Strong user value, but the distribution hard filter + maintenance-fit
drag it down hard. Likely a *companion feature of BidDiff* rather than
a standalone product — which is itself a useful conclusion.

## Provisional scoring (first principles)
| Factor | Wt | Prov. | Note |
|---|--:|--:|---|
| Revenue ceiling | 18 | 6 | real GovCon spend, but focused-tool price unclear |
| Prob. of ceiling | 14 | 4 | distribution + ops drag |
| Distribution quality | 14 | **3** | **fails the hard filter** unless Slack/BidDiff path |
| Maintenance fit | 10 | **3** | always-on pipeline, source-dependent |
| Build feasibility | 10 | 6 | engine exists; the watch pipeline is the new, fragile work |
| Self-serve monetization | 8 | 7 | Stripe/Slack billing feasible |
| Defensibility | 8 | 5 | the critical-summary wedge + clause dataset |
| Evidence quality | 10 | tbd | §1/§2 |
| Strategic fit | 8 | 7 | reuses engine + dataset; compounds with BidDiff |

**Read:** user-loved but **distribution- and maintenance-filtered**.
Best disposition: a **BidDiff companion / Slack app**, not a standalone
SaaS bet. Confirm with cited sections.

# METHODOLOGY — every parameter and assumption

This documents exactly how `calculator.py` models a property and how `build_map.py` ranks them. Defaults are in parentheses; the agent overrides the user-specific ones from `config.json`.

## The thesis
Target properties where **rent would cover the mortgage by the time the owner moves out**. Cash flow is measured at the **first full month after move-out**, when the place becomes a full rental.

## Financing & timing
- **Down payment / cash** (`--down`, default $225,000) — what the buyer puts in.
- **Mortgage rate** (`--rate`, default 6.25%), **30-year fixed** term.
- **Move-out year** (`--moveout-years`, default 2) — how long they live there before renting the whole place. *This is the central configurable number.*
- **Co-occupant rent** (`--cooccupant`, default none) — rent a spouse/partner/roommate pays during the live-in phase.

## Income & vacancy
- **Rent** (`--rent`, per unit) — the agent supplies real comps; otherwise a built-in by-bedroom estimate is used (studio→1bd→…→6bd). Multifamily sums across units.
- **NETF (net effective factor)** = `(1 − vacancy − bad_debt) × (1 − management)`.
  - **Vacancy** (`--vacancy`, default 5%) — *recommended:* anchor to real local data (city/county apartment-association or Census ACS vacancy), and nudge down for single-family / small multifamily, which lease tighter than new apartment towers. The Denver example uses ~4.0–7.25% by submarket.
  - **Bad debt** 1%. **Property management** 12%.

## Expenses
- **Property tax** (`--taxrate`, default 0.42% effective) — *must* be set per county; ranges from ~0.3% to ~2.2% nationally.
- **Insurance** (`--insurance`) and **CapEx** (`--capex`) — if not provided, price-scaled estimates are used; get a real insurance quote for finalists.
- **HOA** (`--hoa`) — from the listing for condos/townhomes.

## Long-term / net-worth model (for the charts and ranking)
- **Home appreciation** 3% nominal (~0.5% real). **S&P 500** 7.5% nominal (~5% real) — the "invest the down payment instead and rent forever" baseline.
- **Inflation / rent & expense growth** 2.5%.
- **At sale:** selling cost 6.5%, long-term cap-gains 15%, depreciation recapture 25%, building depreciated over 27.5 years at 80% of value.
- **Horizon** 35 years (`horizon_years` in config). All net-worth figures are after-tax, in today's dollars.

## Ranking metric (in `build_map.py`)
```
metric = (12 × horizon_years × monthly_cash_flow) + (year-35 net worth − invest-instead net worth)
```
The `12 × horizon` term scales the monthly margin into lifetime dollars so it carries roughly equal weight to the long-term advantage over investing. Higher metric = better = ranked #1. No artificial multipliers — better-rentability areas keep more rent, which lifts both cash flow and net worth naturally.

## Green vs. screened
- **Green (mapped):** move-out cash flow ≥ cutoff (`green_cutoff_per_month`, default −$1,000/mo).
  - Dark green = profitable (≥ $0/mo); yellow-green = loses less than the cutoff (tour & negotiate).
- **Screened (appendix only):** below the cutoff. Still ranked, just not mapped.

## Map encoding
- **Shape = type:** single-family & townhome = circle, condo = square, multifamily = triangle.
- **Color = cash flow:** profitable = dark green, loses-but-within-cutoff = yellow-green.
- Rank number is printed inside each marker.

## What's exact vs. estimated
The arithmetic is exact and deterministic. The **inputs** (rent, HOA, insurance, tax, vacancy) are where error lives. Always label them as estimates unless a real figure was used, and verify finalists.

---

## Additional baked-in assumptions (important — these were easy to miss)

These are real defaults inside `calculator.py`. The agent should override the user-specific ones, not silently rely on them.

- **Live-in income default = $1,500/mo.** During the years you live there (before move-out), the model assumes a spouse/partner/roommate contributes rent. If `--cooccupant` isn't set it defaults to **$1,500/mo** (just **$250/mo** for a single-family studio/1-bed). *Always set this from the user's answer — it materially changes the live-in phase.*
- **Multifamily live-in phase:** you're assumed to occupy the **largest unit** and already collect market rent on the **other units** during the live-in years; at move-out you rent your unit too.
- **Down-payment strategy:** the recommendation deploys your **full available cash as down payment** (after covering closing costs), which is what maximizes cash flow — so for a cheap condo this becomes effectively **all-cash**. A **20%-down** path (more liquidity) and **buying points** are shown/available as alternatives.
- **Invest-instead baseline:** the "rent forever and invest the down payment in the S&P" comparison assumes the renter pays **$1,500/mo rent**, growing with inflation. This underpins the "beats investing by" figure and the ranking metric.
- **Surplus deployment is automatic:** monthly surplus is **invested in the S&P** when its expected return (7.5%) beats the mortgage rate by ~0.45pt, otherwise it's used to **pay down the mortgage** — whichever wins for that rate.
- **Default condo/townhome HOA = $300/mo** when not provided (SFH/multifamily default to $0 HOA). Insurance and CapEx auto-scale with price (e.g. SFH insurance ≈ 0.85%/yr, CapEx ≈ 1.0%/yr of price). *Override with real figures for finalists; for high-rise condos the real HOA is often much higher (~$500+).*
- **No primary-residence capital-gains exclusion.** Sales are taxed fully (15% long-term cap gains + 25% depreciation recapture); the IRS Section 121 $250k/$500k exclusion is **not** applied. This is deliberately conservative — real after-tax proceeds may be higher if the home qualifies.
- **The default rent/insurance/CapEx numbers were calibrated to Denver's inner ring.** For another metro the built-in by-bedroom rent schedule will be off — but the fix isn't to accept it. When a property-specific comp isn't available, **research the market-level number and pass it in** (`--rent`, `--insurance`, `--taxrate`, `--vacancy`), exactly as the Denver run was built. The built-in default is a last resort, and should be flagged when used. See the fallback ladder in `RESEARCH_GUIDE.md`. The arithmetic generalizes; the *default inputs* don't.
- **Owner-occupiable assumption:** the model assumes you can legally live in it for the live-in period (owner-occupant financing); the 2-year default also aligns with primary-residence loan occupancy norms.

## Other calculator flags (not in the quick list)
- `--cash` — alias for `--down` (down payment / cash invested).
- `--rentadj` — a single neighborhood/condition multiplier on the estimated rent (e.g. `1.15` for a strong block) when you're using the built-in estimate instead of comps.
- `--baths` — baths per unit, a small refinement when not using comps.
- `--ppr` — rate reduction per discount point (default 0.0025), for the points analysis.

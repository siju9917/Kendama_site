# DENVER BUILD PLAN — methodology record

> **How this maps to this repo (read first):** the plan below was written against a standalone Denver
> working copy. In this product:
> - the calculator the plan calls **`denver_calculator.py`** is the product's core **`../../calculator.py`**
>   (the §1 insurance patch is already applied there); `denver_calculator.py` in this folder is a thin
>   re-export of it.
> - **`denver_model.py`** and **`apify_ingest.py`** live **in this folder** (`examples/denver/`), already
>   wired to the core calculator and the repo's `../../templates/map_template.html`.
> - the map output is **`output/Denver_Green_Properties_Map.html`** (git-ignored; you generate it).
> So §1 is done; you run §6/§7 with your own Apify export. Everything below is the unchanged spec.

---

**Goal:** Replace the stale, hand-built property snapshot with a repeatable pipeline that ingests a
current **Apify Zillow "for sale" export for Denver** and rebuilds the curated Leaflet map using the
corrected economics, neighborhood-aware rent model, condition gate, and wealth ranking developed in the
chat session of June 2026. Scope is **Denver only**.

## 0. Background (don't re-litigate)
- $225,000 cash as the down payment; every property modeled at $225k down. `CASH = 225_000`.
- House-hack: live ~2 years, then rent. "Move-out cash flow" is the headline number.
- The old map mixed in rentals and sold homes. Fix: source from a for-sale-filtered Apify scrape and
  drop anything not `FOR_SALE`.
- Zillow/Redfin list pages are bot-blocked from an agent sandbox; the owner runs the Apify actor and
  provides the export; this pipeline consumes that file.

## 1. Insurance patch (the one required code edit) — DONE in `../../calculator.py`
`type_defaults(typ, price)`: condo 0.15%/yr (min $40), multi/ADU 0.35%/yr, SFH 0.30%/yr. Everything
else unchanged (rate 6.25%, tax 0.42%, vacancy 5%, bad debt 1%, PM 12%, CapEx, closing, S&P 7.5%,
appreciation 3%, 35-yr horizon).

## 2. Rent model (`denver_model.py` — don't change the numbers)
Rent = base + declining marginal per bedroom × neighborhood multiplier × house factor, per unit, summed.
- `BASE = {0:1450, 1:1700, 2:2350, 3:2950, 4:3450, 5:3900, 6:4300}` (mult 1.0 = citywide whole-unit median).
- Neighborhood multipliers compressed 0.90–1.30 (full table in `denver_model.NB`).
- House factor: condo 1.00, SFH 1.10, multi/ADU 1.08.
- **Cross-check (within ~$100):** LoDo 2bd condo → ~$3,008; LoHi 3bd house → ~$3,959. Printed on every build.

## 3. Metrics (`denver_model.compute_metrics`)
`cf` (move-out cash flow), `ceiling`, `cushion` (~$300/mo), `y35` (35-yr after-tax net worth, 2026 $),
`vsidx` (= `y35` − fixed invest-the-cash baseline `idx35`). `idx35` computed once via
`fixed_invest_baseline(dc)` (≈ $1.0M at $225k cash).

## 4. Condition gate (`denver_model.assign_gates`)
Price-per-bedroom z-score within each category cohort (Condo / Single-family / Multifamily):
`ppb = price / total_beds`; z = (ppb − cohort median)/(1.4826·MAD).
z ≤ −1.0 → warn "low $/bed"; z ≥ +1.5 → warn "high $/bed"; else ok (condos prefixed "HOA-borne").
Evidence overrides win (`denver_model.HARD`); listing keywords (`fixer`/`value-add` → bad, `renovated`
→ ok) also override. This is a **value-for-money screen, not a condition measurement**. Badges render
as livable / verify / distressed with the reason in the hover tooltip.

## 5. Ranking + map UI
Rank by `vsidx` desc; `metric = vsidx` (every display reflects the wealth lens). `apify_ingest` injects
the session UI upgrades idempotently: a **"Livable only"** toggle, condition badges, and the wealth-lens
caption — preserving all existing curated UI. `PROPS` schema (20 keys): `slug, name, area, type, cat,
tier, note, price, cf, gap, ceiling, cushion, y35, vsidx, lat, lng, metric, rank, gate, cond`.
`cat` ∈ {Condo, Single-family, Multifamily}; `tier` ∈ {central, fringe}.

## 6. The Apify pipeline
Owner runs an Apify Zillow actor with a **for-sale**, Denver-area, ≤ ~$1,000,000 search, exports CSV/JSON:
```
python apify_ingest.py --input <export.csv|json>
```
It filters to active for-sale only, maps Zillow fields, computes metrics, gates, ranks, and renders.
**Known limitation (multifamily):** the Search scraper returns *total* beds, not per-unit config;
`split_units` approximates and tags the note `unit config est`. For accuracy, also run the Apify Zillow
*Detail* scraper on the multifamily subset and parse unit configs (a follow-up enrichment).

## 7. Run order
1. (Done) §1 insurance patch in `../../calculator.py`.
2. (Done) `denver_model.py` + `apify_ingest.py` in this folder.
3. Smoke test with `sample_apify_export.csv` (confirms metrics, render, and the §2 cross-checks).
4. When you have the real Apify export, run §6 and open `output/Denver_Green_Properties_Map.html`.
5. Verify §8 acceptance tests.

## 8. Acceptance tests (build is correct iff all pass)
- Rent cross-check: LoDo 2bd condo ≈ $3,008; LoHi 3bd house ≈ $3,959 (±~$100).
- No rentals/sold: 0 surviving rows with `FOR_RENT`/`SOLD`/`PENDING`.
- Schema intact: every `PROPS` object has all 20 keys; `cat`/`tier` use allowed values.
- UI intact: HTML contains `id="map"`, `id="lightOnly"`, `id="fringe"`, `id="livableOnly"`,
  `function gbadge(`, `function popupHTML`, `L.marker`, `Fraunces`.
- Coords: every rendered property has numeric `lat`/`lng`.
- Sanity: `idx35` ≈ $1.0M; multis generally outrank single units; a ~$600k central 2bd condo is much
  closer to breakeven than the ~−$1,400 it showed before the insurance+rent fix.

## 9. What NOT to do
- Don't scrape Zillow/Redfin from the agent — rely on the Apify export.
- Don't re-inflate insurance or revert to the flat rent schedule.
- Don't drop cost components (PM, vacancy, bad debt, CapEx, tax, closing).
- Don't present the $/bed gate as a true condition measurement — it's a value screen.
- Don't change `CASH` from $225,000 unless the owner gives a new figure.

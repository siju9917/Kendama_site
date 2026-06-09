# Denver — your live setup

This folder is the **owner's working Denver instance**, wired to the repo's calculator and map
template so you can actually use it with your numbers (**$225,000 down · 6.25% rate · move out at
year 2**), not just read an example. It encodes the modeling fixes from the June 2026 session:
corrected insurance, a neighborhood-aware rent model, a price-per-bedroom condition gate, and
ranking by long-term wealth. The methodology spec is `DENVER_BUILD_PLAN.md`; the model itself is
`denver_model.py` (don't change the numbers without re-validating).

> **Where the fixes live:** the one required code edit — the **insurance correction** — is applied in
> the product's core `../../calculator.py` (so every consumer gets it). `denver_calculator.py` here is a
> thin re-export of that core calculator, so there is one source of truth for the math.

## What you can do

### 1) Ask about a single address → full report
```bash
cd rent-covers-mortgage/examples/denver
python3 address.py "2900 Tennyson St" --price 800000 --type sfh --units 3 --area "LoHi"
```
It estimates this address's market rent from its **neighborhood + bedrooms + type**, then prints the
full underwriting report (move-out cash flow, the most you should pay, 35-yr net worth vs. investing)
and saves it + the two plots to `output/`.

- `--type` ∈ `condo · townhome · sfh · sfh+adu · duplex · triplex · fourplex`
- `--units` = bedrooms **per unit**, comma-separated (`3` for a 3-bed SFH; `2,2` for a duplex; `studio`/`adu` = 0)
- `--area "LoHi"` (any Denver neighborhood; substring-matched) **or** `--zip 80211`
- **Rent is the #1 driver** — for a finalist, pull a real comp and pass `--rent 3300` (per unit, same order as `--units`) to override the estimate.
- Owner params default to $225k down / 6.25% / year-2 move-out; override with `--cash`, `--rate`, `--moveout-years`, `--insurance`, `--hoa`.

### 2) Build the live map / HTML from a current for-sale scrape
Zillow/Redfin list pages are bot-blocked from an agent, so you run an **Apify** Zillow actor
(`maxcopell/zillow-scraper` or `maxcopell/zillow-zip-search`) with a **for-sale**, Denver-area,
≤ ~$1,000,000 search and export **CSV or JSON**. Then:
```bash
python3 apify_ingest.py --input your_export.csv
# wrote output/Denver_Green_Properties_Map.html
```
It keeps **only active for-sale** listings (drops rentals & sold — the bug that put a rental and a sold
home on the old map), computes the corrected economics + neighborhood rent, applies the condition gate,
ranks by wealth, and renders the curated interactive map (condition badges, a **"Livable only"** toggle,
shaped markers, search, plots). Open the HTML in a browser; to share it, host it free (tiiny.host /
Netlify Drop) and send the link — a texted `.html` opens in a preview that won't run.

A tiny `sample_apify_export.csv` is included so you can try the pipeline immediately:
```bash
python3 apify_ingest.py --input sample_apify_export.csv
```

### Acceptance cross-checks (printed on every map build)
The rent model is calibrated to your lived rents and must hold within ~$100:
**LoDo 2bd condo ≈ $3,008 · LoHi 3bd house ≈ $3,959.** Both reproduce exactly.

## Files
| File | What it is |
|---|---|
| `address.py` | single-address report (neighborhood rent → full calculator report) |
| `apify_ingest.py` | Apify for-sale export → curated map HTML |
| `denver_model.py` | the validated rent model + condition gate + wealth ranking (numbers are calibrated — don't edit casually) |
| `denver_calculator.py` | thin re-export of the patched core `../../calculator.py` |
| `DENVER_BUILD_PLAN.md` | the methodology spec / what changed and why |
| `sample_apify_export.csv` | a small synthetic export for smoke-testing |
| `Map.html`, `Log.md`, `runs_sample/` | the earlier worked example output (generic pipeline) |

Generated output (`output/`, `config.json`, `properties.json`, `runs/`) is git-ignored — it's your run,
not part of the product.

## Reusing this for another city
The arithmetic generalizes; the *data* doesn't. Copy `denver_model.py` and swap the `NB` neighborhood
multipliers + `BASE` rents, and `apify_ingest.py`'s `ZIP_AREA`/`FRINGE_ZIPS`, calibrated to that market.

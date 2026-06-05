# OUTPUT_SPEC — exact file schemas

**Recommended path: `listings.csv` → `batch.py`.** Put every researched listing as a row in `listings.csv` (copy `listings.example.csv`), then run `python3 batch.py`. It runs `calculator.py` on each row, auto-parses the numbers, writes `properties.json` + `series.json` for you, saves an audit copy to `runs/<slug>.txt`, and prints flags (rent outliers, missing coordinates, preflight gaps). This is faster and avoids transcription mistakes. The `listings.csv` columns are documented at the top of `batch.py`.

If you'd rather build `properties.json` by hand (or tweak what `batch.py` produced), the schemas below are the contract `build_map.py` consumes.

The agent produces three JSON files (copies of the `.example.json` templates) — directly, or via `batch.py` — then runs `python3 build_map.py`.

## config.json
```json
{
  "region_name": "Denver",          // used in the title
  "snapshot_date": null,            // null = today's date
  "green_cutoff_per_month": -1000,  // mapped if cash flow >= this
  "horizon_years": 35,
  "price_cap": 950000,              // optional, display only
  "down_payment": 225000,           // optional, shown in subtitle
  "rate": 0.0625,                   // optional, shown in subtitle
  "moveout_years": 2                // optional, shown in subtitle
}
```

## properties.json  (array; one object per analyzed listing)
```json
{
  "name": "3327 Krameria St ABC",   // REQUIRED — address/label
  "area": "North Park Hill",        // neighborhood
  "type": "triplex",                // condo|townhome|sfh|sfh+adu|duplex|triplex|fourplex
  "price": 699999,                  // REQUIRED
  "lat": 39.7649, "lng": -104.9197, // REQUIRED to appear on the map
  "cf": 1668,                       // REQUIRED — move-out monthly cash flow (from calculator)
  "y35": 2920000,                   // 35-yr net worth (from calculator)
  "idx": 1027112,                   // invest-instead 35-yr net worth (from calculator)
  "ceiling": 760000,                // "most you should pay" (from calculator)
  "gap": 60001,                     // +under / −over list price (from calculator)
  "cushion": 690000,                // target-with-cushion (from calculator)
  "tier": "core",                   // "core" or "fringe" (fringe is toggle-hidden by default)
  "note": "2bd+2bd+2bd; verify rents",
  "slug": ""                        // optional; auto-derived from name if omitted
}
```
Required: `name`, `price`, `lat`, `lng`, `cf`. Everything else improves the popup/ranking; omit if unknown (the row still shows). `y35` + `idx` enable the "beats investing by" figure and the ranking metric.

## series.json  (optional — powers the click-through charts)
```json
{
  "3327_Krameria_St_ABC": {
    "cash": [36 yearly values, $thousands],
    "nw":   [36 yearly net-worth-if-sold values, $thousands],
    "inv":  [36 yearly invest-instead values, $thousands]
  }
}
```
Key = the property's slug. Get each array from `calculator.py ... --emit-series --noplot` (capture the `@@SERIES@@` JSON line). Greens without a series entry simply won't have a plot link.

## Build
```bash
python3 build_map.py
# → output/Map.html  and  output/Log.md
```

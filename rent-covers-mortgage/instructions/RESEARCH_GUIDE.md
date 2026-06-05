# RESEARCH_GUIDE — how to source the inputs

You (the agent) browse the web for these. Everything is an estimate unless it's a hard listing figure — say so.

## 1. Find listings
- **Preferred — ask the user for an export.** The best coverage comes from the user, not scraping: a Zillow saved-search share link, a Redfin "Download all" CSV, or any agent/MLS export. Ask for it first. Public-page search returns a thin, stale slice by comparison.
- **Fallback — search yourself:** Zillow, Redfin, Homes.com, Realtor.com, local MLS-fed brokerage sites. Tell the user this is a partial slice, not a complete MLS pull, and offer to ingest any list they paste.
- Collect per listing: **address, price, type, beds (per unit for multifamily), listing URL.**
- **Exclude:** sold / pending / under-contract / coming-soon, and anything in the wrong municipality (a neighboring city, not the user's target).
- **De-duplicate** the same address appearing from multiple sources.
- Respect the user's price cap and types. Small multifamily (duplex/triplex/fourplex) is worth prioritizing — it usually cash-flows best.

## 2. Estimate rent (per unit)
- Zillow "Rent Zestimate," Rentometer, and comparable active rentals nearby.
- For multifamily, estimate each unit by its bedroom count and sum them.
- Prefer real comps over the calculator's built-in by-bedroom estimate; pass them with `--rent`.

## 3. HOA / insurance / tax / vacancy
- **HOA:** from the listing (condos/townhomes). Pass `--hoa` (monthly).
- **Insurance:** a reasonable annual estimate for the area/price (e.g. landlord policy); pass `--insurance` (monthly).
- **Property tax:** the county's effective rate (assessor site or a reliable summary). Pass `--taxrate` as a decimal. This varies a LOT.
- **Vacancy:** look for local data (city/county apartment association reports, Census ACS rental-vacancy). Nudge down for SFH/small multifamily vs. apartment-tower headline. Pass `--vacancy` as a decimal. If you can't find it, the 5% default is fine — note it.

## 4. Geocode
- Get **lat/lng** for each address from a real geocoder — the **US Census geocoder** (geocoding.geo.census.gov) or **OpenStreetMap/Nominatim**. **Never guess or approximate coordinates** — a wrong pin looks correct and is worse than no pin. Required for a listing to appear on the map.

## How many to run
- Run the calculator on every plausible listing under the user's cap; the map only shows the green ones, but analyzing the reds makes the ranking and the screened-out appendix meaningful. Use `--noplot` for speed.

## The fallback ladder (do this for every input)
The calculator ships with built-in default numbers that are **calibrated to Denver**, so don't lean on them for another city. But you almost never have to: when you can't find the niche figure, **go research the general one and pass it in.** Walk down this ladder for each input and stop at the first rung you can fill:

1. **Specific:** the real number for this exact property (a Rent Zestimate for the unit, the listing's stated HOA, the county's actual tax rate). Best.
2. **General / market-level (research it — this is the key step):** if the specific number isn't available, look up the *market's* typical number and use that. This is exactly how the Denver run was built. Examples:
   - **Rent:** find the metro's typical rent **by bedroom count** (Zillow Observed Rent Index, Zumper/Apartment List metro reports, RentCafe). Build a quick by-bedroom table for the city once, then apply it per listing with `--rent`, nudging for neighborhood with `--rentadj`.
   - **Property tax:** the county's published effective rate → `--taxrate`.
   - **Insurance:** a typical landlord-policy figure for that state/price band → `--insurance`.
   - **Vacancy:** the metro/county rental-vacancy rate (local apartment association report or Census ACS), nudged down for SFH/small multifamily → `--vacancy`.
   - **HOA:** if a condo listing omits it, use a typical figure for that building class in that market (and say it's an estimate).
3. **Built-in default (last resort only):** if you genuinely can't find even a market number, the calculator's default fires — but it's Denver-flavored, so **flag it to the user** ("used a fallback estimate for X; verify before offering").

The point: a missing niche number is a cue to **research the general number**, not to silently accept the Denver-calibrated default. Establish the market's rent/tax/insurance/vacancy baseline up front, then refine per property where you can.

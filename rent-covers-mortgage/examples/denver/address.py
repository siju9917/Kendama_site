#!/usr/bin/env python3
"""
address.py  —  "give it an address, get the full report" for Denver, with the owner's parameters.

It applies the session's neighborhood-aware rent model (denver_model) to estimate the market rent for
THIS address from its neighborhood + bedrooms + type, then runs the patched calculator to produce the
full underwriting report (move-out cash flow, the most you should pay, 35-yr net worth vs. investing),
at the owner's real figures: $225,000 down, 6.25% rate, move out at year 2.

USAGE
  python address.py "1234 Tennyson St" --price 625000 --type sfh   --units 3      --area "West Highland"
  python address.py "50 Lakeview"      --price 480000 --type condo --units 2      --zip 80212
  python address.py "900 Tennyson"     --price 825000 --type duplex --units 2,2    --area LoHi
  python address.py "X St"             --price 600000 --type condo --units 2      --area LoDo --rent 3008  # override rent with a real comp

NOTES
  - Rent is the #1 driver. The estimate is neighborhood-aware but you should still pull a real comp for a
    finalist and pass it with --rent (per-unit, comma-separated, same order as --units).
  - --area takes any Denver neighborhood string (substring-matched to the multiplier table); or pass --zip
    and it maps to a representative neighborhood. Unknown areas default to the citywide multiplier (1.00).
"""
import argparse, subprocess, sys
from pathlib import Path

import denver_model as M
from apify_ingest import ZIP_AREA

ROOT = Path(__file__).resolve().parents[2]          # rent-covers-mortgage/
CALC = ROOT / 'calculator.py'

TYPES = ('condo', 'townhome', 'sfh', 'sfh+adu', 'duplex', 'triplex', 'fourplex')

def parse_units(s):
    return [0 if x.strip().lower() in ('studio', 'adu', 's', '0') else int(''.join(ch for ch in x if ch.isdigit()))
            for x in s.split(',')]

def main():
    ap = argparse.ArgumentParser(description="Single-address Denver report with neighborhood-aware rent.")
    ap.add_argument('address')
    ap.add_argument('--price', type=float, required=True)
    ap.add_argument('--type', required=True, help='one of: ' + ', '.join(TYPES))
    ap.add_argument('--units', required=True, help='bedrooms per unit, comma-separated (studio/adu = 0)')
    ap.add_argument('--area', default=None, help='neighborhood string (e.g. "LoHi", "Capitol Hill")')
    ap.add_argument('--zip', default=None, help='ZIP (maps to a representative neighborhood if --area omitted)')
    ap.add_argument('--rent', default=None, help='REAL per-unit comp(s), comma-separated — overrides the estimate')
    # owner-parameter passthroughs (sensible Denver defaults already live in the calculator/config)
    ap.add_argument('--cash', type=float, default=225_000)
    ap.add_argument('--rate', type=float, default=None)
    ap.add_argument('--moveout-years', dest='moveout_years', type=float, default=None)
    ap.add_argument('--insurance', type=float, default=None)
    ap.add_argument('--hoa', type=float, default=None)
    ap.add_argument('--outdir', default=str(Path(__file__).resolve().parent / 'output'))
    ap.add_argument('--noplot', action='store_true')
    a = ap.parse_args()

    typ = a.type.lower()
    typ_model = 'condo' if typ in ('condo', 'townhome') else typ   # house_factor: townhome ~ condo
    beds = parse_units(a.units)
    area = a.area or (ZIP_AREA.get(str(a.zip), 'Denver') if a.zip else 'Denver')

    if a.rent:
        rent_arg = a.rent.replace(' ', '')
        rents = [float(x) for x in rent_arg.split(',')]
        rent_src = 'YOUR COMP'
    else:
        rents = M.unit_rents(beds, area, typ_model)
        rent_arg = ','.join(str(int(r)) for r in rents)
        rent_src = 'neighborhood estimate'

    mult, hf = M.nb_mult(area), M.house_factor(typ_model)
    print("=" * 74)
    print(f"ADDRESS:        {a.address}")
    print(f"NEIGHBORHOOD:   {area}   (rent multiplier x{mult:g}, house factor x{hf:g})")
    print(f"CONFIG:         {a.type}  ·  beds/unit {beds}  ·  list ${a.price:,.0f}  ·  ${a.cash:,.0f} down")
    print(f"RENT BASIS:     {rent_src} — per unit {['$%d'%round(r) for r in rents]}  =  ${sum(rents):,.0f}/mo total")
    if not a.rent:
        print("                (pull a real comp for a finalist and re-run with --rent)")
    print("=" * 74)

    args = [sys.executable, str(CALC),
            '--price', str(int(a.price)), '--type', typ, '--units', a.units.replace(' ', ''),
            '--rent', rent_arg, '--name', a.address, '--cash', str(a.cash), '--outdir', a.outdir]
    if a.rate is not None:          args += ['--rate', str(a.rate)]
    if a.moveout_years is not None: args += ['--moveout-years', str(a.moveout_years)]
    if a.insurance is not None:     args += ['--insurance', str(a.insurance)]
    if a.hoa is not None:           args += ['--hoa', str(a.hoa)]
    if a.noplot:                    args += ['--noplot']
    sys.exit(subprocess.run(args).returncode)

if __name__ == '__main__':
    main()

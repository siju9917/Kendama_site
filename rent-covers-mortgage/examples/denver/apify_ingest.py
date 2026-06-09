"""
apify_ingest.py  —  Turn an Apify Zillow "for sale" export (CSV or JSON) into the Denver map.

PIPELINE:
  1. Load the Apify export (maxcopell/zillow-scraper or zillow-zip-search output).
  2. Keep ONLY active for-sale rows  (drops rentals & sold — the bug that put 1825 W 32nd / 3233 Curtis on the old map).
  3. Map Zillow fields -> (price, type, beds-per-unit, neighborhood, lat/lng).
  4. Run each through denver_model.compute_metrics (which imports the PATCHED calculator).
  5. Apply the price-per-bedroom condition gate, rank by wealth.
  6. Render into the repo's curated template (templates/map_template.html), injecting the session UI upgrades.

USAGE:
  python apify_ingest.py  --input dataset.csv
  python apify_ingest.py  --input dataset.json  --out output/Denver_Green_Properties_Map.html

Requires calculator.py (PATCHED per DENVER_BUILD_PLAN.md, at the product root) and the sibling
denver_model.py / denver_calculator.py. Run it from anywhere; paths are resolved relative to this file.
"""
import argparse, csv, json, re, datetime, os
from pathlib import Path

import denver_calculator as dc
import denver_model as M

HERE = Path(__file__).resolve().parent
ROOT = Path(__file__).resolve().parents[2]               # rent-covers-mortgage/
TEMPLATE = ROOT / 'templates' / 'map_template.html'
LEAFLET_CSS = ROOT / 'leaflet.inline.css'
LEAFLET_JS = ROOT / 'leaflet.inline.js'

# --- Denver core ZIP -> representative neighborhood label (must contain an NB key in denver_model) ---
# Prefer a real neighborhood field from the scraper when present; fall back to this zip map.
ZIP_AREA = {
    '80211': 'Highlands/LoHi', '80212': 'West Highland', '80203': 'Capitol Hill',
    '80204': 'Lincoln Park', '80205': 'Five Points/RiNo', '80206': 'Congress Park',
    '80218': 'Capitol Hill', '80210': 'Platt Park', '80209': 'Wash Park',
    '80220': 'Park Hill', '80207': 'Park Hill', '80223': 'Baker',
    '80219': 'Athmar', '80221': 'Chaffee Park', '80216': 'Curtis Park',
}
FRINGE_ZIPS = {'80212', '80221', '80219', '80207', '80216'}   # outer; everything else 'central'

def g(item, *keys, default=None):
    """Get the first present key (handles JSON nested-ish and CSV slash-flattened keys)."""
    for k in keys:
        if k in item and item[k] not in (None, '', 'null'):
            return item[k]
    return default

def to_float(x):
    if x is None: return None
    s = re.sub(r'[^0-9.]', '', str(x))
    return float(s) if s else None

def home_type_to_typ(ht, beds):
    """Map Zillow homeType -> (typ, cat). Returns (None, None) to SKIP (land/apartment/etc.)."""
    h = (ht or '').upper()
    if 'SINGLE' in h:                      return 'sfh', 'Single-family'
    if 'CONDO' in h:                       return 'condo', 'Condo'
    if 'TOWNH' in h:                       return 'condo', 'Condo'        # townhome ~ condo (HOA-borne)
    if 'MULTI' in h or 'PLEX' in h:
        return _plex_typ(beds), 'Multifamily'
    return None, None                      # APARTMENT / LOT / LAND / MANUFACTURED -> skip

def _plex_typ(total_beds):
    """MULTI_FAMILY: Zillow gives total beds, not per-unit. Approximate unit count -> typ.
    NOTE: for accuracy on multis, re-run the Apify *Detail* scraper and parse unit config from the
    description; this heuristic is a placeholder so the property still appears, flagged 'unit est'."""
    b = int(total_beds or 4)
    if b >= 7:  return 'fourplex'
    if b >= 5:  return 'triplex'
    return 'duplex'

def split_units(typ, total_beds):
    """Even split of total beds across the inferred unit count (placeholder for multis)."""
    n = {'duplex': 2, 'triplex': 3, 'fourplex': 4}.get(typ, 1)
    b = int(total_beds or (2 * n))
    base = max(1, b // n)
    beds = [base] * n
    for i in range(b - base * n):          # distribute remainder
        beds[i] += 1
    return beds

def type_display(typ, beds):
    if typ == 'condo':
        b = beds[0]
        return 'Condo ' + ('studio' if b == 0 else f'{b}bd')
    if typ == 'sfh':
        return f'SFH {beds[0]}bd'
    if typ == 'sfh+adu':
        return 'SFH+ADU ' + '+'.join(map(str, beds))
    return f'{typ.capitalize()} ' + '+'.join(map(str, beds))

def slugify(name):
    return re.sub(r'[^A-Za-z0-9]+', '_', name).strip('_')

def area_for(item, zip_code):
    nb = g(item, 'neighborhood', 'hdpData/homeInfo/neighborhood')   # use real neighborhood if present
    if nb: return nb
    return ZIP_AREA.get(str(zip_code), 'Denver')

def is_for_sale(item):
    status = (g(item, 'statusType', 'homeStatus', 'hdpData/homeInfo/homeStatus', default='') or '').upper()
    return 'FOR_SALE' in status or status == 'FSBO' or 'FOR SALE' in status

def load(path):
    if path.lower().endswith('.json'):
        data = json.load(open(path, encoding='utf-8'))
        return data if isinstance(data, list) else data.get('items', [])
    with open(path, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))

def build_records(items):
    today = datetime.date.today().isoformat()
    recs, skipped = [], 0
    for it in items:
        if not is_for_sale(it):
            skipped += 1; continue
        price = to_float(g(it, 'unformattedPrice', 'price', 'hdpData/homeInfo/price'))
        beds_total = to_float(g(it, 'beds', 'bedrooms', 'hdpData/homeInfo/bedrooms')) or 0
        ht = g(it, 'homeType', 'propertyType', 'hdpData/homeInfo/homeType')
        typ, cat = home_type_to_typ(ht, beds_total)
        if typ is None or not price:
            skipped += 1; continue
        lat = to_float(g(it, 'latitude', 'latLong/latitude', 'hdpData/homeInfo/latitude'))
        lng = to_float(g(it, 'longitude', 'latLong/longitude', 'hdpData/homeInfo/longitude'))
        addr = g(it, 'address', 'streetAddress', 'addressStreet') or g(it, 'detailUrl', 'url') or 'Unknown'
        addr = re.sub(r',?\s*(Denver|CO|USA|\d{5}).*$', '', str(addr)).strip().rstrip(',') or str(addr)
        zip_code = g(it, 'addressZipcode', 'zipcode', 'hdpData/homeInfo/zipcode', default='')
        beds = [int(beds_total)] if cat != 'Multifamily' else split_units(typ, beds_total)
        note = f'Apify for-sale scrape {today}' + (' · unit config est' if cat == 'Multifamily' else '')
        recs.append(dict(name=addr, price=price, typ=typ, cat=cat, beds=beds,
                         area=area_for(it, zip_code), zip=str(zip_code),
                         lat=lat, lng=lng, note=note))
    return recs, skipped

def build_props(recs):
    idx35 = M.fixed_invest_baseline(dc)
    props = []
    for r in recs:
        if r['lat'] is None or r['lng'] is None:
            continue                                  # need coords to place on map
        m = M.compute_metrics(dc, r['price'], r['typ'], r['beds'], r['area'], idx35)
        tier = 'fringe' if r['zip'] in FRINGE_ZIPS else 'central'
        props.append({
            'slug': slugify(r['name']), 'name': r['name'], 'area': r['area'],
            'type': type_display(r['typ'], r['beds']), 'cat': r['cat'], 'tier': tier,
            'note': r['note'], 'price': int(r['price']),
            'cf': m['cf'], 'gap': m['gap'], 'ceiling': m['ceiling'], 'cushion': m['cushion'],
            'y35': m['y35'], 'vsidx': m['vsidx'], 'lat': r['lat'], 'lng': r['lng'],
            'metric': m['vsidx'], 'rank': 0, 'gate': 'ok', 'cond': '',
            '_beds': sum(r['beds']),
        })
    M.assign_gates(props)
    M.rank_by_wealth(props)
    return props

# --- inject the session UI upgrades into the curated template (idempotent) ---
def upgrade_html_ui(html):
    if 'id="livableOnly"' not in html:
        html = html.replace(
            '<label class="toggle"><input type="checkbox" id="fringe" checked/> Incl. fringe</label>\n</div>',
            '<label class="toggle"><input type="checkbox" id="fringe" checked/> Incl. fringe</label>\n'
            '<label class="toggle"><input type="checkbox" id="livableOnly"/> Livable only</label>\n</div>')
        html = html.replace(
            "document.getElementById('fringe').onchange=e=>{state.fringe=e.target.checked;render();};",
            "document.getElementById('fringe').onchange=e=>{state.fringe=e.target.checked;render();};\n"
            "document.getElementById('livableOnly').onchange=e=>{state.livableOnly=e.target.checked;render();};")
    if 'function gbadge(' not in html:
        html = html.replace(
            "function visible(){return PROPS.filter(p=>{if(!state.cats.has(p.cat))return false;",
            "function gbadge(p){var g={ok:['#dcfce7','#166534'],warn:['#fef9c3','#854d0e'],"
            "bad:['#fee2e2','#991b1b']}[p.gate||'warn'];return '<span title=\"'+(p.cond||'')+'\" "
            "style=\"display:inline-block;font-size:8.5px;font-weight:700;padding:1px 5px;border-radius:7px;"
            "background:'+g[0]+';color:'+g[1]+';margin-left:5px;vertical-align:1px\">'"
            "+({ok:'livable',warn:'verify',bad:'distressed'}[p.gate||'warn'])+'</span>';}\n"
            "function visible(){return PROPS.filter(p=>{if(!state.cats.has(p.cat))return false;"
            "if(state.livableOnly&&p.gate==='bad')return false;")
        html = html.replace("'<div class=\"sub\">'+p.area+' &middot; '+fmt(p.price)+'</div>'",
                            "'<div class=\"sub\">'+p.area+' &middot; '+fmt(p.price)+gbadge(p)+'</div>'")
        html = html.replace("'<div class=\"area\">'+p.area+' &middot; '+p.type+'</div>'",
                            "'<div class=\"area\">'+p.area+' &middot; '+p.type+gbadge(p)+'</div>'")
    return html

def render(out_path, props, region='Denver'):
    """Fill the curated template's placeholders, inline the Leaflet library, and inject the UI upgrades."""
    html = TEMPLATE.read_text(encoding='utf-8')
    lcss = LEAFLET_CSS.read_text(encoding='utf-8')
    ljs = LEAFLET_JS.read_text(encoding='utf-8')
    today = datetime.date.today().strftime('%B %d, %Y')
    n = len(props)
    profitable = sum(1 for p in props if p['cf'] >= 0)
    title = f"{region} Green Properties"
    subtitle = (f"{n} active for-sale listings &middot; {profitable} profitable at move-out &middot; "
                f"snapshot {today} &middot; ${int(M.CASH):,} down &middot; {dc.RATE_DEFAULT*100:.2f}% rate &middot; "
                f"move out at year 2 &middot; ranked by long-term wealth (35-yr net worth vs. investing the cash). "
                f"Shapes = type. Color = profitable (green) vs. loses at move-out (yellow-green). "
                f"Rents, HOAs &amp; insurance are estimates, not a complete MLS. Click a pin or row for full analysis.")
    html = (html.replace('__LEAFLETCSS__', lcss).replace('__LEAFLETJS__', ljs)
                .replace('__TITLE__', title).replace('__SUBTITLE__', subtitle)
                .replace('__CUTOFF__', '$0/mo')
                .replace('__DATA__', json.dumps(props)).replace('__SERIES__', '{}'))
    html = upgrade_html_ui(html)
    # this pipeline ranks by long-term wealth, not the generic CF-blended metric — fix the static caption.
    html = html.replace('Ranked by metric = (12×35 × monthly CF) + amount it beats investing by. Highest first.',
                        'Ranked by long-term wealth — 35-yr after-tax net worth vs. investing the cash instead. Highest first.')
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(out_path).write_text(html, encoding='utf-8')

def rent_crosscheck():
    """Acceptance cross-check (DENVER_BUILD_PLAN §2/§8): must hold within ~$100 of the owner's lived rents."""
    lodo = sum(M.unit_rents([2], 'LoDo', 'condo'))
    lohi = sum(M.unit_rents([3], 'LoHi', 'sfh'))
    print(f"rent cross-check: LoDo 2bd condo = ${lodo:,} (target ~$3,008) | "
          f"LoHi 3bd house = ${lohi:,} (target ~$3,959)")
    return lodo, lohi

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', required=True, help='Apify export .csv or .json')
    ap.add_argument('--out', default=str(HERE / 'output' / 'Denver_Green_Properties_Map.html'))
    a = ap.parse_args()
    items = load(a.input)
    recs, skipped = build_records(items)
    props = build_props(recs)
    render(a.out, props)
    pos = sum(1 for p in props if p['cf'] >= 0)
    rent_crosscheck()
    print(f'Loaded {len(items)} rows | kept {len(props)} for-sale (skipped {skipped} rentals/sold/land/no-coords)')
    print(f'idx35 (invest-the-cash baseline) = ${M.fixed_invest_baseline(dc):,.0f}')
    print(f'CF>=0: {pos}/{len(props)} | wrote {a.out}')
    print('Top 5 by wealth:')
    for p in props[:5]:
        print(f"  #{p['rank']} {p['name'][:30]:<30} {p['type'][:14]:<14} ${p['price']:>9,} CF {p['cf']:+} beats ${p['vsidx']:,} [{p['gate']}]")

if __name__ == '__main__':
    main()

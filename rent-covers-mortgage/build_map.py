#!/usr/bin/env python3
"""
build_map.py — turn properties.json (+ optional series.json) into the interactive
map (output/Map.html) and the ranked log (output/Log.md).

It reuses the exact, validated template in templates/map_template.html. You do
NOT edit this file per-run; you only edit config.json + properties.json and run:

    python3 build_map.py

Inputs (same folder):
  config.json       region name, cutoff, thesis params (all optional; see config.example.json)
  properties.json   array of analyzed listings (see properties.example.json)
  series.json       optional {slug:{cash:[36],nw:[36],inv:[36]}} for the click-through plots
  leaflet.inline.css / leaflet.inline.js   inlined map library (shipped with the repo)
  templates/map_template.html              the validated UI template

Output:
  output/Map.html   self-contained interactive map (greens only)
  output/Log.md     ranked table + screened appendix + method notes
"""
import json, os, re, datetime, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
def _load(name, default):
    fp = os.path.join(ROOT, name)
    if not os.path.exists(fp):
        return default
    with open(fp) as f:
        return json.load(f)

cfg    = _load('config.json', {}) or {}
props  = _load('properties.json', []) or []
series = _load('series.json', {}) or {}

region   = cfg.get('region_name', 'Your Market')
cutoff   = int(cfg.get('green_cutoff_per_month', -1000))   # mapped if monthly cash flow >= cutoff
horizon  = int(cfg.get('horizon_years', 35))
snapshot = cfg.get('snapshot_date') or datetime.date.today().strftime('%B %d, %Y')
down     = cfg.get('down_payment')
rate     = cfg.get('rate')
moveout  = cfg.get('moveout_years')
price_cap= cfg.get('price_cap')

if not props:
    sys.exit("No properties.json found (or it's empty). Fill it in first — see properties.example.json.")

def slugify(name):
    return re.sub(r'[^A-Za-z0-9 ]', '', name).replace(' ', '_')

def cat(typ):
    t = (typ or '').lower()
    if 'condo' in t: return 'Condo'
    if any(k in t for k in ['adu','duplex','triplex','fourplex','plex','multi','unit']): return 'Multifamily'
    return 'Single-family'   # single-family AND townhomes share the circle marker

allp = []
for p in props:
    name = p['name']
    typ  = p.get('type', 'Single-family')
    rec = dict(
        slug   = p.get('slug') or slugify(name),
        name   = name,
        area   = p.get('area', ''),
        type   = typ,
        cat    = cat(typ),
        tier   = p.get('tier', 'core'),
        note   = p.get('note', ''),
        price  = p.get('price'),
        cf     = int(round(p.get('cf', 0))),
        y35    = p.get('y35'),
        idx    = p.get('idx'),
        ceiling= p.get('ceiling'),
        gap    = p.get('gap'),
        cushion= p.get('cushion'),
        lat    = p.get('lat'),
        lng    = p.get('lng'),
    )
    rec['vsidx'] = (rec['y35'] - rec['idx']) if (rec['y35'] is not None and rec['idx'] is not None) else None
    allp.append(rec)

HORIZON = 12 * horizon
for p in allp:
    p['metric'] = HORIZON * p['cf'] + (p['vsidx'] if p['vsidx'] is not None else 0)

greens = [p for p in allp if p['cf'] >= cutoff and p['lat'] is not None and p['lng'] is not None]
greens.sort(key=lambda p: -p['metric'])
for i, p in enumerate(greens): p['rank'] = i + 1

reds = [p for p in allp if p['cf'] < cutoff]
reds.sort(key=lambda p: -p['metric'])
for i, p in enumerate(reds): p['rank'] = len(greens) + i + 1

no_coords = [p for p in allp if p['cf'] >= cutoff and (p['lat'] is None or p['lng'] is None)]

data  = json.dumps(greens)
sdata = json.dumps({p['slug']: series[p['slug']] for p in greens if p['slug'] in series})

# ---------- titles ----------
def money(v): return '—' if v is None else f"${v:,.0f}"
cutoff_txt = f"${abs(cutoff):,.0f}/mo"
title = f"{region} Green Properties"
thesis_bits = []
if down is not None:    thesis_bits.append(f"${down:,.0f} down")
if rate is not None:    thesis_bits.append(f"{rate*100:.2f}% rate")
if moveout is not None: thesis_bits.append(f"move out at year {moveout:g}")
thesis = (" &middot; ".join(thesis_bits)) if thesis_bits else ""
cap_txt = f"under ${price_cap:,.0f} &middot; " if price_cap else ""
subtitle = (f"{len(greens)} green listings (of {len(allp)} analyzed) &middot; {cap_txt}snapshot {snapshot}"
            + (f" &middot; {thesis}" if thesis else "")
            + f" &middot; only listings with move-out cash flow &ge; &minus;{cutoff_txt} are shown. "
            + "Shapes = type. Rents &amp; HOAs are estimates, not a complete MLS. Click a pin or row for full analysis.")

# ---------- emit map ----------
tpl  = open(os.path.join(ROOT, 'templates', 'map_template.html')).read()
lcss = open(os.path.join(ROOT, 'leaflet.inline.css')).read()
ljs  = open(os.path.join(ROOT, 'leaflet.inline.js')).read()
html = (tpl.replace('__LEAFLETCSS__', lcss).replace('__LEAFLETJS__', ljs)
           .replace('__TITLE__', title).replace('__SUBTITLE__', subtitle)
           .replace('__CUTOFF__', cutoff_txt).replace('__DATA__', data).replace('__SERIES__', sdata))
os.makedirs(os.path.join(ROOT, 'output'), exist_ok=True)
open(os.path.join(ROOT, 'output', 'Map.html'), 'w').write(html)

# ---------- emit log ----------
def sgn(v): return ("+" if v >= 0 else "−") + "$" + f"{abs(v):,.0f}"
idx_best = greens[0]['idx'] if greens and greens[0].get('idx') is not None else None
L = []
L.append(f"# {title} — Ranked Log\n")
intro = (f"*Snapshot {snapshot} · {len(allp)} listings analyzed · {len(greens)} came back green "
         f"(move-out cash flow ≥ −{cutoff_txt}). **Ranking metric = (12×{horizon} × monthly cash flow) + "
         f"amount it beats investing by** (all signed; highest = #1). The 12×{horizon} scales the monthly "
         f"margin into lifetime dollars so it carries equal weight to the long-term net-worth advantage over "
         f"investing the down payment instead. After-tax, {horizon}-yr horizon.*")
L.append(intro + "\n")
L.append("**Tiers:** 🟢 dark green = **profitable** (≥ $0/mo) · 🟡 yellow-green = **loses < cutoff** "
         "(worth touring and trying to negotiate the price down).\n")
L.append("> 📲 **Sharing the map:** to text `Map.html` to someone, don't send the file (it opens in a phone "
         "preview that won't run it). Host it free and share the link — drag it onto **tiiny.host** or "
         "**Netlify Drop**, or a public Dropbox/iCloud folder, and send the URL.\n")
light = [p for p in greens if p['cf'] >= 0]; dark = [p for p in greens if p['cf'] < 0]

def tbl(rows):
    out = ["| # | Address | Area | Type | Price | Monthly CF | Yr-%d net worth | vs. investing | Metric |" % horizon,
           "|---|---|---|---|---|---|---|---|---|"]
    for p in rows:
        vs = "—" if p['vsidx'] is None else sgn(p['vsidx'])
        cf = ("+" if p['cf'] >= 0 else "−") + "$" + f"{abs(p['cf']):,}"
        tier = "🟢" if p['cf'] >= 0 else "🟡"
        out.append(f"| {p['rank']} | {tier} {p['name']} | {p['area']} | {p['type']} | {money(p['price'])} "
                   f"| {cf}/mo | {money(p['y35'])} | {vs} | {sgn(p['metric'])} |")
    return "\n".join(out)

L.append(f"\n## Ranked green list — by metric = (12×{horizon} × monthly CF) + amount it beats investing by\n")
L.append("Both tiers are mapped; ranking is the single metric (highest first).\n")
L.append(tbl(greens))
L.append("\n---\n")
L.append(f"## Screened out — below the −{cutoff_txt} cutoff, not mapped ({len(reds)})\n")
if reds:
    L.append("| # | Address | Area | Type | Price | Monthly CF | vs. investing | Metric |")
    L.append("|---|---|---|---|---|---|---|---|")
    for p in reds:
        cf = ("+" if p['cf'] >= 0 else "−") + "$" + f"{abs(p['cf']):,}"
        vs = "—" if p['vsidx'] is None else sgn(p['vsidx'])
        L.append(f"| {p['rank']} | {p['name']} | {p['area']} | {p['type']} | {money(p['price'])} | {cf}/mo | {vs} | {sgn(p['metric'])} |")
else:
    L.append("_None — every analyzed listing cleared the cutoff._")
if no_coords:
    L.append(f"\n> ⚠ {len(no_coords)} listing(s) cleared the cutoff but are missing lat/lng, so they are not on the map. "
             "Add coordinates in properties.json to map them: " + ", ".join(p['name'] for p in no_coords))
L.append("\n---\n## Method & honest limits\n")
L.append(f"- **Thesis:** target places where rent would cover the mortgage by the time you move out "
         f"(here: {thesis or 'see config.json'}). Cash flow is measured the first full month after you move out and rent the whole place.")
L.append("- **Cash flow** is pre-income-tax operating cash flow (rent minus mortgage P&I, property tax, insurance, HOA, CapEx), "
         "net of vacancy, bad debt, and property management. **Net worth** is after-tax equity if sold that year, in today's dollars, "
         "vs. investing the same down payment in the S&P 500 and renting instead.")
L.append("- **Rents, HOAs, insurance, and taxes are estimates** unless you fed in real numbers. The calculator math is exact; the inputs carry "
         "the error — verify any finalist with real rent comps and the real HOA/tax before making an offer.")
L.append("- **Coverage is only as complete as the listings that were gathered.** This is a snapshot; listings change daily. "
         "See instructions/METHODOLOGY.md for the full parameter list and instructions/RESEARCH_GUIDE.md for how the inputs were sourced.")
open(os.path.join(ROOT, 'output', 'Log.md'), 'w').write("\n".join(L))

print(f"OK — {region}: analyzed={len(allp)} green={len(greens)} (profitable={len(light)} loses<cutoff={len(dark)}) screened={len(reds)}"
      + (f" | {len(no_coords)} green missing coords" if no_coords else ""))
print("Wrote output/Map.html and output/Log.md")
print("")
print("📲 To text this map to someone: a texted .html file opens in a phone preview that won't run the map.")
print("   Host it for free instead and share the LINK — drag output/Map.html onto tiiny.host or")
print("   Netlify Drop (app.netlify.com/drop), or a public Dropbox/iCloud folder, and text the URL.")

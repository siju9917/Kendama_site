#!/usr/bin/env python3
"""
batch.py — the data pipeline. Reads listings.csv, runs calculator.py on every row,
auto-parses the numbers, and writes properties.json + series.json so you can then
run build_map.py. This replaces hand-transcribing six numbers per listing.

    python3 batch.py            # reads listings.csv + config.json
    python3 batch.py homes.csv  # custom CSV path

CSV columns (header row required). Required: name, type, price.
Strongly recommended: beds, lat, lng, rent.
  name       address / label                      e.g. 3327 Krameria St ABC
  area       neighborhood                          e.g. North Park Hill
  type       condo|townhome|sfh|sfh+adu|duplex|triplex|fourplex
  price      number                                e.g. 699999
  beds       bedrooms PER UNIT, comma-sep          e.g. 2,2,2  (studio=0; a 3-bed sfh = 3)
  rent       market rent PER UNIT, comma-sep        e.g. 2100,2100,2100  (blank = use estimate, flagged)
  lat, lng   coordinates (look them up, never guess; blank = won't appear on the map)
  hoa        monthly HOA (blank = default; $300 for condo/townhome, else 0)
  insurance  monthly (blank = price-scaled estimate)
  capex      monthly (blank = price-scaled estimate)
  cooccupant monthly rent a partner/roommate pays during the live-in phase (blank = default $1,500!)
  vacancy    decimal e.g. 0.06 (blank = config default)
  tier       core|fringe (blank = core)
  note       free text

Global thesis params come from config.json: down_payment, rate, moveout_years, taxrate, vacancy.
"""
import csv, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
CSV  = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'listings.csv')
cfg  = {}
cfp  = os.path.join(ROOT, 'config.json')
if os.path.exists(cfp):
    cfg = json.load(open(cfp)) or {}

if not os.path.exists(CSV):
    sys.exit(f"No CSV at {CSV}. Copy listings.example.csv to listings.csv and fill it in.")

g_down    = cfg.get('down_payment')
g_rate    = cfg.get('rate')
g_moveout = cfg.get('moveout_years')
g_tax     = cfg.get('taxrate')
g_vac     = cfg.get('vacancy')

def num(s):
    """parse a money/number string -> float, tolerating $ , unicode minus, blanks."""
    if s is None: return None
    s = str(s).strip().replace(',', '').replace('$', '').replace('\u2212', '-').replace('%', '')
    if s == '': return None
    try: return float(s)
    except ValueError: return None

def grab(pat, text, group=1):
    m = re.search(pat, text)
    return m.group(group) if m else None

def slugify(name):
    return re.sub(r'[^A-Za-z0-9 ]', '', name).replace(' ', '_')

rows = list(csv.DictReader(open(CSV, newline='')))
if not rows:
    sys.exit("listings.csv has a header but no rows.")

os.makedirs(os.path.join(ROOT, 'runs'), exist_ok=True)
props, series, flags, seen = [], {}, [], set()

# preflight reminder
missing_globals = [k for k, v in [('down_payment', g_down), ('rate', g_rate),
                                   ('moveout_years', g_moveout), ('taxrate', g_tax)] if v is None]
if missing_globals:
    flags.append(f"PREFLIGHT: config.json is missing {', '.join(missing_globals)} — "
                 "confirm these with the user before trusting results (defaults will be used).")

for i, r in enumerate(rows, 1):
    r = {(k or '').strip().lower(): (v or '').strip() for k, v in r.items()}
    name = r.get('name', '')
    if not name or not r.get('price'):
        flags.append(f"row {i}: skipped — missing name or price."); continue
    slug = slugify(name)
    if slug in seen:
        flags.append(f"row {i} ({name}): duplicate of an earlier row — skipped."); continue
    seen.add(slug)

    typ   = (r.get('type') or 'sfh').lower()
    price = num(r.get('price'))
    beds  = r.get('beds', '')
    rent  = r.get('rent', '')

    # sanity bounds
    if price is None or price <= 0:
        flags.append(f"row {i} ({name}): bad price '{r.get('price')}' — skipped."); continue
    if price < 40000 or price > 5_000_000:
        flags.append(f"row {i} ({name}): price ${price:,.0f} looks off — double-check.")
    if rent:
        rv = sum(x for x in (num(p) for p in rent.split(',')) if x is not None)
        if rv and (rv * 12 / price > 0.40 or rv * 12 / price < 0.02):
            flags.append(f"row {i} ({name}): rent ${rv:,.0f}/mo vs price ${price:,.0f} is an outlier — verify the comp.")
    if not (r.get('lat') and r.get('lng')):
        flags.append(f"row {i} ({name}): no lat/lng — it will NOT appear on the map until you add coordinates.")
    if not rent:
        flags.append(f"row {i} ({name}): no rent comp — calculator will ESTIMATE (Denver-calibrated). Add a real --rent comp.")
    if not r.get('cooccupant'):
        flags.append(f"row {i} ({name}): no co-occupant rent set — defaulting to $1,500/mo for the live-in phase. Confirm with user.")

    # assemble calculator args
    args = [sys.executable, os.path.join(ROOT, 'calculator.py'),
            '--price', str(int(price)), '--type', typ, '--name', name, '--emit-series', '--noplot']
    if beds: args += ['--units', beds.replace(' ', '')]
    if rent: args += ['--rent', rent.replace(' ', '')]
    for col, flag in [('hoa', '--hoa'), ('insurance', '--insurance'), ('capex', '--capex'),
                      ('cooccupant', '--cooccupant')]:
        v = num(r.get(col))
        if v is not None: args += [flag, str(v)]
    # per-row override beats global
    vac = num(r.get('vacancy')) if r.get('vacancy') else g_vac
    if vac is not None: args += ['--vacancy', str(vac)]
    if g_down    is not None: args += ['--down', str(g_down)]
    if g_rate    is not None: args += ['--rate', str(g_rate)]
    if g_moveout is not None: args += ['--moveout-years', str(g_moveout)]
    if g_tax     is not None: args += ['--taxrate', str(g_tax)]

    try:
        out = subprocess.run(args, capture_output=True, text=True, timeout=120)
    except Exception as e:
        flags.append(f"row {i} ({name}): calculator failed to run ({e})."); continue
    txt = out.stdout
    if out.returncode != 0 or 'CASH FLOW' not in txt:
        flags.append(f"row {i} ({name}): calculator error — {(out.stderr or txt)[:160]}"); continue

    open(os.path.join(ROOT, 'runs', f'{slug}.txt'), 'w').write(txt)

    cf       = num(grab(r'CASH FLOW:\s*\$?(-?[\d,]+)', txt))
    y35      = num(grab(r'year 35:\s*\$?([\d,]+)', txt))
    idx      = num(grab(r'rent instead:\s*\$?([\d,]+)', txt))
    ceiling  = num(grab(r'MOST YOU SHOULD PAY[^:]*:\s*\$?([\d,]+)', txt))
    cushion  = num(grab(r'Aim at or below \*\*\$?([\d,]+)', txt))
    gm = re.search(r'sits \*\*\$?([\d,]+)\s*(BELOW|ABOVE)', txt)
    gap = (num(gm.group(1)) * (1 if gm.group(2) == 'BELOW' else -1)) if gm else None
    sm = re.search(r'@@SERIES@@\s*(\{.*\})', txt)
    if sm:
        try: series[slug] = json.loads(sm.group(1))
        except Exception: pass

    props.append({k: v for k, v in dict(
        name=name, area=r.get('area', ''), type=typ, price=int(price),
        lat=num(r.get('lat')), lng=num(r.get('lng')),
        cf=int(round(cf)) if cf is not None else 0,
        y35=int(round(y35)) if y35 is not None else None,
        idx=int(round(idx)) if idx is not None else None,
        ceiling=int(round(ceiling)) if ceiling is not None else None,
        gap=int(round(gap)) if gap is not None else None,
        cushion=int(round(cushion)) if cushion is not None else None,
        tier=(r.get('tier') or 'core'), note=r.get('note', ''), slug=slug,
    ).items() if v is not None or k in ('area', 'note')})

json.dump(props,  open(os.path.join(ROOT, 'properties.json'), 'w'), indent=1)
json.dump(series, open(os.path.join(ROOT, 'series.json'), 'w'))

print(f"Processed {len(rows)} rows -> {len(props)} properties, {len(series)} with series.")
print("Wrote properties.json and series.json.  Next: python3 build_map.py")
if flags:
    print(f"\n⚠ {len(flags)} flag(s) to review:")
    for f in flags: print("  - " + f)

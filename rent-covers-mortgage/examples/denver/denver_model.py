"""
denver_model.py  —  Canonical economics + rent model + condition gate for the Denver project.
Encodes every modeling improvement made in the chat session of 2026-06.

It IMPORTS the repo's denver_calculator.py and uses its (validated) financial functions, so the
35-year net-worth math, amortization, tax, depreciation, and sale logic stay identical to the CLI tool.
This module only changes the *inputs* that the session proved were wrong, and adds the gate + ranking.

WHAT CHANGED THIS SESSION (apply these and you reproduce the chat's map):
  1) INSURANCE was ~3x too high. Patch denver_calculator.type_defaults() (see DENVER_BUILD_PLAN.md
     for the exact find/replace). After patching: SFH 0.30%/yr, condo 0.15%/yr (min $40), multi 0.35%/yr.
  2) RENT was too low AND not neighborhood-aware. The flat RENT_BY_BED schedule is REPLACED by the
     base+marginal x neighborhood x house-factor model below (rent_total()). A whole-unit 2bd is NOT
     2x a 1bd; the kitchen/bath/living "base" is fixed and each bedroom adds a declining increment.
     Cross-check (must hold): LoDo 2bd condo ~= $3,000 ; LoHi 3bd house ~= $3,950 (matches owner's lived rents).
  3) CONDITION GATE is a price-per-bedroom cohort z-score (no sqft needed), applied to ALL properties,
     not a condo-auto-pass. Hard overrides for toured/known properties win.
  4) RANK by long-term wealth (vsidx = 35yr net worth minus the fixed invest-the-cash baseline).
  5) CASH = $225,000 down for every property (owner's real figure), rest assumed invested.

All costs from the original tool remain in force: PM 12%, vacancy 5%, bad debt 1%, property tax 0.42%,
insurance (corrected), CapEx reserve (unchanged), closing costs. Nothing real was removed.
"""
import re
import statistics as st
import collections

CASH = 225_000          # owner's cash-to-deploy (down payment); remainder assumed invested
# RATE comes from denver_calculator.RATE_DEFAULT (0.0625)

# ---------------------------------------------------------------------------
# 1) RENT MODEL  (base + declining marginal)  x  neighborhood multiplier  x  house factor
# ---------------------------------------------------------------------------
# BASE = whole-unit market rent at neighborhood multiplier 1.0 (citywide whole-unit median).
# Calibrated to the median of ApartmentAdvisor / Zumper / Rentometer / HUD (2026) by bedroom count.
# Declining marginal: studio->1 +250, 1->2 +650, 2->3 +600, 3->4 +500, 4->5 +450, 5->6 +400.
BASE = {0: 1450, 1: 1700, 2: 2350, 3: 2950, 4: 3450, 5: 3900, 6: 4300}

def base_rent(beds: int) -> float:
    return BASE.get(beds, BASE[6] + (beds - 6) * 380)

# Neighborhood multipliers — data-informed from RentCafe's Denver neighborhood ranking, COMPRESSED
# to 0.90-1.30 (blended neighborhood averages are confounded by unit mix, so don't take ratios
# literally). Matched by SUBSTRING against the property's area/neighborhood string (lowercased).
NB = {
    'lodo': 1.28, 'downtown': 1.28, 'cherry creek': 1.28,
    'rino': 1.20, 'wash park': 1.20,
    'highland': 1.22, 'lohi': 1.22, 'sloan': 1.22,           # 'highland' also catches 'West Highland'
    'berkeley': 1.12, 'baker': 1.12, 'curtis park': 1.12,
    'five points': 1.10,
    'sunnyside': 1.08, 'speer': 1.08, 'platt park': 1.08,
    'cheesman': 1.06, 'cheeseman': 1.06,
    'congress park': 1.05, 'city park': 1.05, 'jefferson park': 1.05,
    'governors park': 1.02, 'uptown': 1.02, 'park hill': 1.02,
    'capitol hill': 1.00, 'cap hill': 1.00, 'university': 1.00, '/du': 1.00,
    'lincoln park': 1.00, 'edgewater': 1.00,
    'west colfax': 0.95, 'chaffee': 0.95, 'overland': 0.95,
    'villa park': 0.92, 'athmar': 0.90,
}

def nb_mult(area: str) -> float:
    a = (area or '').lower()
    for key, val in NB.items():
        if key in a:
            return val
    return 1.00   # default for unrecognized Denver neighborhoods

def house_factor(typ: str) -> float:
    """Whole houses rent above condos of the same bedroom count (Rentometer/Zumper)."""
    if typ == 'condo':
        return 1.00
    if typ == 'sfh':
        return 1.10
    return 1.08   # duplex / triplex / fourplex / sfh+adu units

def unit_rents(beds_list, area, typ):
    """Per-unit whole-unit rents for the model. beds_list = bedrooms per unit, e.g. [2,2] for a duplex."""
    m, hf = nb_mult(area), house_factor(typ)
    return [round(base_rent(b) * m * hf) for b in beds_list]

# ---------------------------------------------------------------------------
# 2) BEDROOM / TYPE PARSING  from a display string like "Triplex 2+2+1" or "Condo 2bd"
# ---------------------------------------------------------------------------
def parse_type(type_string: str):
    """Return (typ, beds_list).  typ in {condo, sfh, sfh+adu, duplex, triplex, fourplex}."""
    low = type_string.lower()
    if 'adu' in low:
        typ = 'sfh+adu'
    elif 'fourplex' in low:
        typ = 'fourplex'
    elif 'triplex' in low:
        typ = 'triplex'
    elif 'duplex' in low:
        typ = 'duplex'
    elif 'condo' in low or 'town' in low:
        typ = 'condo'
    else:
        typ = 'sfh'
    m = re.search(r'(\d+)\s*[×x]\s*(\d+)\s*bd', low)   # "4x1bd" / "4×1bd"
    if m:
        beds = [int(m.group(2))] * int(m.group(1))
    else:
        spec = re.sub(r'(condo|sfh\+adu|sfh|duplex|triplex|fourplex|townhome|town|adu|bd)', '', low).replace('studio', '0')
        parts = [p for p in re.split(r'[^0-9]+', spec) if p != '']
        beds = [int(p) for p in parts] if parts else [2]
    return typ, beds

# ---------------------------------------------------------------------------
# 3) METRICS  (import the repo calculator, reproduce main()'s headline numbers exactly)
# ---------------------------------------------------------------------------
def fixed_invest_baseline(dc, cash=CASH):
    """idx35 = the after-tax net worth of investing `cash` in the S&P and renting.
    Identical across all properties (same cash), so rank-by-vsidx == rank-by-y35. Computed once."""
    rate = dc.RATE_DEFAULT
    t0 = dc.ARCH[0]
    P0, L0, dn0 = dc.arch_ceiling(t0, cash, rate)
    cl0 = dc.closing(P0, L0, rate, t0['ins'])
    bk0 = 0.0 if t0['cash'] else max(0.0, cash - dn0 - cl0)
    _, idx0, _ = dc.networth_series(P0, L0, rate, t0['p1'], t0['rent'],
                                    t0['ins'], t0['hoa'], t0['capex'], bk0, 'invest', cash)
    return idx0[420]

def compute_metrics(dc, price, typ, beds_list, area, idx35, cash=CASH):
    """Returns dict(cf, ceiling, cushion, y35, vsidx, gap, rent_total) for one property."""
    rate = dc.RATE_DEFAULT
    P = float(price)
    hoa, ins, capex = dc.type_defaults(typ, P)          # insurance here must be the PATCHED value
    rents = unit_rents(beds_list, area, typ)
    rt = float(sum(rents))
    single = len(beds_list) == 1
    owner = max(rents)
    co_occ = 250.0 if (single and beds_list[0] <= 1) else 1500.0
    p1 = co_occ + (0.0 if single else rt - owner)        # live-in (yr 1-2) revenue
    d = dc.max_down_for_cash(P, cash, rate, ins)
    L = P - d
    cf = dc.cf_moveout(P, d, rate, ins, hoa, capex, rt)
    leftover = max(0.0, cash - d - dc.closing(P, L, rate, ins))
    B, _, _ = dc.networth_series(P, L, rate, p1, rt, ins, hoa, capex, leftover, 'invest', cash)
    y35 = B[420]

    def price_for_target(target):
        lo, hi = 120_000, 2_500_000
        for _ in range(80):
            mid = (lo + hi) / 2
            im = dc.type_defaults(typ, mid)[1]
            cx = dc.type_defaults(typ, mid)[2]
            dm = dc.max_down_for_cash(mid, cash, rate, im)
            lo, hi = (mid, hi) if dc.cf_moveout(mid, dm, rate, im, hoa, cx, rt) >= target else (lo, mid)
        return (lo + hi) / 2

    ceiling = price_for_target(0.0)     # max price that still self-sustains at move-out
    cushion = price_for_target(300.0)   # price leaving ~$300/mo cushion
    return dict(cf=round(cf), ceiling=round(ceiling), cushion=round(cushion),
                y35=round(y35), vsidx=round(y35 - idx35),
                gap=round(ceiling - P), rent_total=round(rt))

# ---------------------------------------------------------------------------
# 4) CONDITION GATE — price-per-bedroom cohort z-score + evidence overrides
# ---------------------------------------------------------------------------
# Evidence overrides win over the statistical gate (toured / listing-confirmed condition).
HARD = {
    "603 elati": ("bad", "toured: D"),
    "50 w maple": ("bad", "toured: C-D"),
    "6621 hooker": ("bad", "fixer"),
    "1937 park ave": ("bad", "value-add/fixer"),
    "3110 vallejo": ("ok", "gut renovated"),
    "2551 w caithness": ("ok", "renovated"),
    "1021 e 23rd": ("ok", "renovated"),
    "1225 n clarkson": ("warn", "Victorian — verify"),
}

def assign_gates(props):
    """Mutates each prop dict to add 'gate' (ok/warn/bad) and 'cond' (label). Needs p['price'],
    p['cat'] (Condo/Single-family/Multifamily), p['name'], optional p['note'], and p['_beds'] (total beds)."""
    cohorts = collections.defaultdict(list)
    for p in props:
        p['_ppb'] = float(p['price']) / max(p.get('_beds', 1), 0.5)
        cohorts[p['cat']].append(p['_ppb'])
    stats = {}
    for cat, vals in cohorts.items():
        med = st.median(vals)
        mad = st.median([abs(x - med) for x in vals]) or 1.0
        stats[cat] = (med, 1.4826 * mad)
    for p in props:
        med, sd = stats[p['cat']]
        z = (p['_ppb'] - med) / (sd or 1.0)
        if z <= -1.0:
            g, c = 'warn', f"low $/bed vs {p['cat']} — verify size/condition"
        elif z >= 1.5:
            g, c = 'warn', f"high $/bed vs {p['cat']} — premium or rich, verify"
        else:
            g, c = 'ok', f"typical $/bed for {p['cat']}"
        if p['cat'] == 'Condo' and g == 'ok':
            c = "HOA-borne; " + c
        note = (p.get('note') or '').lower()
        if any(w in note for w in ('fixer', 'value-add', 'value add')):
            g, c = 'bad', 'fixer/value-add (listing)'
        elif any(w in note for w in ('gut reno', 'renovated')):
            g, c = 'ok', 'renovated (listing)'
        for key, (gg, cc) in HARD.items():
            if key in p['name'].lower():
                g, c = gg, cc
        p['gate'], p['cond'] = g, c

def rank_by_wealth(props):
    """Sort by vsidx desc; set rank and metric (metric mirrors vsidx so all UI displays the wealth lens)."""
    props.sort(key=lambda p: p['vsidx'], reverse=True)
    for i, p in enumerate(props, 1):
        p['rank'] = i
        p['metric'] = p['vsidx']
    for p in props:                       # strip private helpers before serialization
        for k in list(p):
            if k.startswith('_'):
                del p[k]
    return props

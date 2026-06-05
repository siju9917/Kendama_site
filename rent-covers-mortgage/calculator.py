#!/usr/bin/env python3
"""
DENVER PROPERTY CALCULATOR  (v6 assumptions, June 2026)  — deterministic single-house underwriter.

Every researched value from the v6 analysis is HARD-CODED below. Running this script is what
guarantees a new chat uses the validated assumptions instead of inventing its own. The report
structure is fixed (same 7 sections every time); only the numbers change per house.

USAGE
  python denver_calculator.py --price 600000 --type duplex --units 2,2
  python denver_calculator.py --price 525000 --type sfh --units 4 --rent 3300
  python denver_calculator.py --price 700000 --type triplex --units 2,2,1 --rent 2400,2400,1700
  python denver_calculator.py --price 480000 --type sfh+adu --units 3,studio --insurance 360 --name "123 Elm"

ARGS
  --price (req)  --type (req)  --units (req, bedrooms per unit; studio/adu = 0)
  --rent        per-unit monthly market rent, comma-separated, SAME ORDER as --units  (USE REAL COMPS)
  --rate        mortgage rate (default 0.0625 = locked quote)        --cash  (default 225000)
  --hoa --insurance --capex   monthly overrides    --cooccupant  monthly roommate income yrs 1-2 (default 1500)
  --ppr         rate cut per discount point (default 0.0025)         --name  label
"""
import argparse, re
import numpy as np
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter

# ============ RESEARCHED ASSUMPTIONS — v6 (do not change without re-validating) ============
RATE_DEFAULT = 0.0625      # your locked conventional 30yr fixed
N            = 360
INFL         = 0.025       # inflation = rent & expense growth (v6)
TAX_RATE     = 0.0042      # 0.42% effective property tax (your real escrow)
VAC, BADDEBT, PM = 0.05, 0.01, 0.12
NETF         = (1-VAC-BADDEBT)*(1-PM)         # 0.8272
GROW         = INFL
MOVEOUT_YEARS= 2.0                            # years you live in it before renting the whole place (CONFIGURABLE per user)
MO           = round(MOVEOUT_YEARS*12)        # move-out month
G2           = (1+INFL)**MOVEOUT_YEARS         # growth factor at move-out
SP_NOM       = 0.075       # forward S&P ~5% real (10yr fcsts 3-6% nom, reverting; hist ~9.5%)
APPR         = 0.03        # home appreciation ~0.5% real (natl 2-4%; Denver 25yr ~4.5%)
LTCG, SELL   = 0.15, 0.065
RECAP        = 0.25
DEP, BLDG    = 27.5, 0.80
CASH_DEFAULT = 225_000
MONTHS       = 420
RENT_RENTER  = 1500        # comparison-renter's rent (held across all options, per v6)

def pifac(rate):
    r=rate/12.0; return r*(1+r)**N/((1+r)**N-1)

# Denver inner-ring WHOLE-UNIT market rents, keyed by THAT UNIT's bedroom count (monthly, 2026).
# NOT a per-bedroom multiplier: it is the rent for one whole unit of that size, and the calculator
# SUMS across units. So a duplex 2bd+2bd ($2,400+$2,400=$4,800) correctly out-rents a 4-bed SFH
# (one 4bd unit, $3,650) — more, and more per room. Marginal rent per bedroom also diminishes within
# a unit (a 4bd is ~1.5x a 2bd, not 2x). These are estimates — OVERRIDE with real comps via --rent.
RENT_BY_BED = {0:1400, 1:1600, 2:2400, 3:3100, 4:3650, 5:4150, 6:4600}
def rent_for_beds(b): return RENT_BY_BED.get(b, RENT_BY_BED[6]+(b-6)*450)

# Default operating expenses. v6 used FIXED per-type values for its 7 archetypes; a calculator must
# handle ANY price, so insurance/CapEx scale with price/type, CALIBRATED to reproduce the v6 figures
# at the archetype prices (e.g. ~$300/mo insurance and ~$400/mo CapEx on a ~$500k SFH). Both are
# ESTIMATES — replace insurance with a real quote (--insurance) and HOA with the real figure (--hoa).
def type_defaults(typ, price):
    t=typ.lower()
    if 'condo' in t or 'town' in t:                     # HOA covers exterior -> low ins/capex
        return 300, max(150, 0.005*price/12), 0.004*price/12
    if 'adu' in t:
        return 0, 0.0095*price/12, 0.011*price/12
    if any(k in t for k in ['duplex','triplex','fourplex','plex','multi']):
        return 0, 0.0095*price/12, 0.012*price/12
    return 0, 0.0085*price/12, 0.010*price/12            # SFH

def closing(P, L, rate, ins_mo):                          # decomposed from the user's real pre-approval
    return 4_100 + L*rate/365*15 + (P*TAX_RATE/12)*4 + ins_mo*15

# ============ REFERENCE ARCHETYPES (identical to the project's two plots) ============
ARCH=[
 dict(name='All-Cash Condo',rent=1550,capex=50,hoa=300,ins=200,p1=250,cash=True),
 dict(name='2-Bed Condo/Townhome',rent=2450,capex=150,hoa=300,ins=200,p1=1500,cash=False),
 dict(name='3-Bed SFH',rent=3100,capex=400,hoa=0,ins=350,p1=1500,cash=False),
 dict(name='4-Bed SFH',rent=3650,capex=450,hoa=0,ins=400,p1=1500,cash=False),
 dict(name='Traditional Duplex',rent=4600,capex=600,hoa=0,ins=450,p1=1500+2300,cash=False),
 dict(name='SFH + Detached ADU',rent=4700,capex=500,hoa=0,ins=450,p1=1500+1600,cash=False),
 dict(name='Triplex (3 Units)',rent=5700,capex=800,hoa=0,ins=550,p1=1500+3800,cash=False),
]
PALETTE=['#6b7280','#0ea5e9','#22c55e','#16a34a','#f59e0b','#ef4444','#8b5cf6']

def solve_loan(P, ins_mo, deploy, rate):
    L=0.80*P
    for _ in range(12): L=P-(deploy-closing(P,L,rate,ins_mo))
    return L, deploy-closing(P,L,rate,ins_mo)

def max_down_for_cash(P, cash, rate, ins):
    _,dn = solve_loan(P, ins, cash, rate); return min(max(dn,0.0), P)

def arch_ceiling(t, cash, rate):
    f=pifac(rate)
    if t['cash']:
        P=cash
        for _ in range(6): P=cash-closing(P,0,rate,t['ins'])
        return P,0.0,P
    lo,hi=100_000,1_400_000
    for _ in range(90):
        mid=(lo+hi)/2; L,_=solve_loan(mid,t['ins'],cash,rate)
        m=t['rent']*G2*NETF-(L*f+mid*TAX_RATE/12*G2+(t['ins']+t['hoa']+t['capex'])*G2)
        lo,hi=(mid,hi) if m>0 else (lo,mid)
    P=(lo+hi)/2; L,dn=solve_loan(P,t['ins'],cash,rate); return P,L,dn

# ============ SIMULATIONS ============
def cashflow_series(P,L,rate,p1,rent,ins,hoa,capex,cash_in):
    f=pifac(rate); cum=-cash_in; out=[cum]; be=None
    for m in range(1,MONTHS+1):
        gf=(1+GROW)**((m-1)/12.0); pi=0.0 if m>360 else L*f
        costs=pi+P*TAX_RATE/12*gf+(ins+hoa+capex)*gf
        net=(p1*gf-costs) if m<=MO else (rent*gf*NETF-costs)
        cum+=net; out.append(cum)
        if be is None and cum>=0: be=m
    return np.array(out), be

def networth_series(P,L,rate,p1,rent,ins,hoa,capex,Bk0,mode,cash,appr=APPR,sp=SP_NOM):
    f=pifac(rate); r=rate/12.0; spm=(1+sp)**(1/12)-1
    R=float(cash); bR=float(cash); Bk=float(Bk0); bBk=float(Bk0); bal=float(L); payoff=None
    B=np.zeros(MONTHS+1); RN=np.zeros(MONTHS+1); B[0]=(P-L)-SELL*P+Bk0; RN[0]=float(cash)
    for m in range(1,MONTHS+1):
        gf=(1+GROW)**((m-1)/12.0); rent_ext=RENT_RENTER*gf
        if bal>1e-6: interest=bal*r; sched=min(L*f-interest,bal); pi_cash=L*f
        else: interest=sched=pi_cash=0.0
        costs=pi_cash+P*TAX_RATE/12*gf+(ins+hoa+capex)*gf
        CF=(p1*gf-costs) if m<=MO else (rent*gf*NETF-costs)
        M_A=(costs-p1*gf) if m<=MO else (rent_ext-CF)
        D=M_A-rent_ext; R*=(1+spm)
        if D>0: R+=D; bR+=D
        surplus=max(0.0,-D); Bk*=(1+spm)
        if bal>1e-6:
            bal-=sched
            if mode=='paydown':
                extra=min(surplus,bal); bal-=extra
                if surplus-extra>0: Bk+=surplus-extra; bBk+=surplus-extra
            else: Bk+=surplus; bBk+=surplus
            if bal<=1e-6 and payoff is None: payoff=m; bal=0.0
        else: Bk+=surplus; bBk+=surplus
        HV=P*(1+appr)**(m/12.0); equity=HV-bal
        dm=min(max(m-MO,0),int(DEP*12)); accum=BLDG*P/DEP/12*dm
        gain=(HV-SELL*HV)-(P-accum); recap=min(accum,max(0.0,gain)); lt=max(0.0,gain-recap)
        if m<=60: lt=max(0.0,lt-250_000)
        htax=RECAP*recap+LTCG*lt; defl=(1+INFL)**(m/12.0)
        B[m]=((equity-SELL*HV-htax)+(Bk-LTCG*max(0.0,Bk-bBk)))/defl
        RN[m]=(R-LTCG*max(0.0,R-bR))/defl
    return B,RN,payoff

def cf_moveout(P,d,rate,ins,hoa,capex,rent):
    L=P-d; return rent*G2*NETF-(L*pifac(rate)+P*TAX_RATE/12*G2+(ins+hoa+capex)*G2)
def bisect_down(P,target,rate,ins,hoa,capex,rent):
    lo,hi=0.0,P
    for _ in range(80):
        mid=(lo+hi)/2
        lo,hi=(mid,hi) if cf_moveout(P,mid,rate,ins,hoa,capex,rent)<target else (lo,mid)
    return (lo+hi)/2

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--price',type=float,required=True); ap.add_argument('--type',type=str,required=True)
    ap.add_argument('--units',type=str,required=True);   ap.add_argument('--rent',type=str,default=None)
    ap.add_argument('--rate',type=float,default=RATE_DEFAULT); ap.add_argument('--cash',type=float,default=CASH_DEFAULT)
    ap.add_argument('--hoa',type=float,default=None); ap.add_argument('--insurance',type=float,default=None)
    ap.add_argument('--capex',type=float,default=None); ap.add_argument('--cooccupant',type=float,default=None)
    ap.add_argument('--ppr',type=float,default=0.0025); ap.add_argument('--name',type=str,default=None)
    ap.add_argument('--baths',type=str,default=None)        # baths per unit (optional refinement; comps override)
    ap.add_argument('--rentadj',type=float,default=1.0)     # neighborhood/condition multiplier (optional; comps override)
    ap.add_argument('--vacancy',type=float,default=None)    # per-neighborhood economic vacancy (overrides global 5%); bad debt & PM unchanged
    ap.add_argument('--down',type=float,default=None)        # down payment / cash invested (alias for --cash; this is what you put down)
    ap.add_argument('--moveout-years',dest='moveout_years',type=float,default=None) # years you live in it before renting the whole place (THE configurable thesis)
    ap.add_argument('--taxrate',type=float,default=None)     # effective annual property tax rate as a decimal (e.g. 0.0125 = 1.25%); varies a lot by state/county
    ap.add_argument('--emit-series',dest='emit_series',action='store_true')  # print downsampled cash/networth series as JSON
    ap.add_argument('--noplot',action='store_true')         # skip PNG rendering (fast batch re-runs)
    a=ap.parse_args()
    global NETF,MO,G2,TAX_RATE
    if a.vacancy is not None:
        NETF=(1.0-a.vacancy-BADDEBT)*(1.0-PM)
    if a.taxrate is not None:
        TAX_RATE=a.taxrate
    if a.moveout_years is not None:
        MO=round(a.moveout_years*12); G2=(1+INFL)**a.moveout_years
    if a.down is not None:
        a.cash=a.down
    P,rate,cash,typ=a.price,a.rate,a.cash,a.type
    f=pifac(rate)

    beds=[0 if s.strip().lower() in('studio','adu','s','0') else int(re.sub(r'[^0-9]','',s)) for s in a.units.split(',')]
    if a.rent:
        unit_rents=[float(x) for x in a.rent.split(',')]; rent_src="YOUR COMPS"
        if len(unit_rents)!=len(beds): unit_rents=(unit_rents*len(beds))[:len(beds)]
    else:
        unit_rents=[float(rent_for_beds(b)) for b in beds]
        # Optional refinements applied ONLY to the schedule estimate (real comps via --rent override all of this):
        #  - bathrooms: nudge vs a bedroom-based baseline (~4%/bath, capped ±12%) — secondary driver, modest effect.
        #  - rentadj: a single neighborhood/condition multiplier you set if the area runs above/below inner-ring avg.
        if a.baths:
            bvals=[float(x) for x in a.baths.split(',')]
            if len(bvals)!=len(beds): bvals=(bvals*len(beds))[:len(beds)]
            base_ba=lambda b:{0:1,1:1,2:1.5,3:2,4:2.5,5:3}.get(b,3+0.5*(b-5))
            unit_rents=[ur*(1+max(-0.12,min(0.12,0.04*(bv-base_ba(b))))) for ur,bv,b in zip(unit_rents,bvals,beds)]
        unit_rents=[ur*a.rentadj for ur in unit_rents]
        tags=[]
        if a.baths: tags.append("baths-adj")
        if a.rentadj!=1.0: tags.append(f"area x{a.rentadj:g}")
        rent_src="model estimate — REPLACE WITH COMPS" + (f" ({', '.join(tags)})" if tags else "")
    unit_rents=[float(x) for x in unit_rents]
    rent_total=float(sum(unit_rents)); is_single=len(beds)==1; owner_unit=float(max(unit_rents))
    co_occ = float(a.cooccupant) if a.cooccupant is not None else (250.0 if (is_single and beds[0]<=1) else 1500.0)
    other_rev = 0.0 if is_single else (rent_total-owner_unit)
    p1 = co_occ + other_rev

    hoa_d,ins_d,capex_d=type_defaults(typ,P)
    hoa  = a.hoa if a.hoa is not None else hoa_d
    ins  = a.insurance if a.insurance is not None else ins_d
    capex= a.capex if a.capex is not None else capex_d

    # ---------- DOWN-PAYMENT STRATEGY (deterministic; priority 1 = cash flow, 2 = long-term) ----------
    # With separate reserves and cash flow as priority #1, the cash-flow-maximizing choice (no points)
    # is to deploy the FULL cash as down payment. That is the recommendation. 20%-down is the
    # liquidity/net-worth alternative. Points are a separate, lender-dependent option.
    d_full=max_down_for_cash(P,cash,rate,ins); close_full=closing(P,P-d_full,rate,ins)
    loan_full=P-d_full; pi_full=loan_full*f
    d20=min(0.20*P,d_full); close20=closing(P,P-d20,rate,ins); loan20=P-d20
    leftover20=max(0.0,cash-d20-close20)
    d_be=bisect_down(P,0,rate,ins,hoa,capex,rent_total)
    def pack(d):
        L=P-d; pi=L*f
        return L,pi,(p1-(pi+P*TAX_RATE/12+ins+hoa+capex)),cf_moveout(P,d,rate,ins,hoa,capex,rent_total)
    L_full,pi_full,live_full,move_full=pack(d_full)
    L_20,pi_20,live_20,move_20=pack(d20)
    sustains_full=move_full>=0
    # MAX price this house should command given its rent (full cash down, expenses held fixed):
    #   the price at which move-out cash flow = target. P_max = break-even ceiling; P_cush = ~$300/mo cushion.
    rent_needed=(pi_full+(P*TAX_RATE/12+ins+hoa+capex)*G2)/(G2*NETF)   # rent that breaks even AT this price
    def price_for_target(target):
        lo,hi=120_000,2_500_000
        for _ in range(90):
            mid=(lo+hi)/2
            insm = ins if a.insurance is not None else type_defaults(typ,mid)[1]
            cxm  = capex if a.capex is not None else type_defaults(typ,mid)[2]
            dmid = max_down_for_cash(mid,cash,rate,insm)
            lo,hi=(mid,hi) if cf_moveout(mid,dmid,rate,insm,hoa,cxm,rent_total)>=target else (lo,mid)
        return (lo+hi)/2
    P_max=price_for_target(0.0); P_cush=price_for_target(300.0)
    gap=P_max-P

    # recommended financing = full down, no points
    d_rec,loan_rec,pi_rec,close_rec,move_rec,live_rec=d_full,loan_full,pi_full,close_full,move_full,live_full
    leftover_rec=max(0.0,cash-d_rec-close_rec)

    # ---------- POINTS (lender-dependent option; funded by reallocating from the down payment) ----------
    pts=[]
    for n in (1,2):
        pcost=n*0.01*loan_full; d_n=max(0.0,d_full-pcost); L_n=P-d_n; nr=rate-n*a.ppr
        pi_n=L_n*pifac(nr); move_n=cf_moveout(P,d_n,nr,ins,hoa,capex,rent_total)
        save=pi_full-pi_n; be=(pcost/(save*12)) if save>0 else 99
        pts.append(dict(n=n,cost=pcost,rate=nr,pi=pi_n,move=move_n,be=be))
    best_pt=max(pts,key=lambda z:z['move']); points_help=best_pt['move']>move_full+1

    # ---------- SURPLUS DEPLOYMENT (invest vs paydown) ----------
    cross=rate+0.0045; surplus_mode='invest' if SP_NOM>cross else 'paydown'

    # ---------- LONG-TERM NET WORTH ----------
    B,RN,_=networth_series(P,loan_rec,rate,p1,rent_total,ins,hoa,capex,leftover_rec,surplus_mode,cash)
    nwB35,nwR35=B[420],RN[420]
    B20,_,_=networth_series(P,loan20,rate,p1,rent_total,ins,hoa,capex,leftover20,surplus_mode,cash)
    nw20_35=B20[420]
    _,_,payoff_pd=networth_series(P,loan_rec,rate,p1,rent_total,ins,hoa,capex,leftover_rec,'paydown',cash)

    # ---------- ARCHETYPES (plots + ranking) ----------
    for t in ARCH:
        t['P'],t['L'],t['dn']=arch_ceiling(t,cash,rate); cl=closing(t['P'],t['L'],rate,t['ins'])
        t['cf'],t['cf_be']=cashflow_series(t['P'],t['L'],rate,t['p1'],t['rent'],t['ins'],t['hoa'],t['capex'], t['P'] if t['cash'] else cash)
        bk0=0.0 if t['cash'] else max(0.0,cash-t['dn']-cl)
        t['nw'],t['idx'],_=networth_series(t['P'],t['L'],rate,t['p1'],t['rent'],t['ins'],t['hoa'],t['capex'],bk0,'invest',cash)
    idx35=ARCH[0]['idx'][420]
    ranked=sorted([(t['name'],t['nw'][420]) for t in ARCH]+[('★ THIS HOUSE',nwB35)],key=lambda z:-z[1])
    ucf,ucf_be=cashflow_series(P,loan_rec,rate,p1,rent_total,ins,hoa,capex,d_rec+close_rec)

    # ===================== PLOTS =====================
    name=a.name or f"{typ} {'/'.join(str(b) if b>0 else 'studio' for b in beds)} @ ${P:,.0f}"
    slug=re.sub(r'[^a-z0-9]+','_',(a.name or f"{typ}_{'-'.join(map(str,beds))}_{int(P/1000)}k").lower()).strip('_')
    cf_png=f"/mnt/user-data/outputs/{slug}_cashflow.png"; nw_png=f"/mnt/user-data/outputs/{slug}_networth.png"
    if not a.noplot:
        x=np.arange(MONTHS+1)/12.0; plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11})
        name_plot=name.replace('$',r'\$')
        head=f"{'SELF-SUSTAINS' if move_rec>=0 else 'SHORTFALL'} at move-out: \\${move_rec:+,.0f}/mo"
        fig,ax=plt.subplots(figsize=(13,8))
        for t,c in zip(ARCH,PALETTE):
            ax.plot(x,t['cf']/1000,lw=1.7,color=c,alpha=0.5,label=f"{t['name']} — ${t['P']:,.0f}")
            if t['cf_be']: ax.plot(t['cf_be']/12,0,'o',color=c,ms=5,alpha=0.5,zorder=4,mec='white',mew=1)
        ax.plot(x,ucf/1000,lw=3.4,color='black',zorder=6,label=f"★ THIS HOUSE — ${P:,.0f}")
        if ucf_be: ax.plot(ucf_be/12,0,'*',color='black',ms=18,zorder=7,mec='white',mew=1.2)
        ax.axhline(0,color='#111827',lw=1.1); ax.axvline(2,color='#9ca3af',ls='--',lw=1.2); ax.axvline(30,color='#9ca3af',ls=':',lw=1.4)
        ax.text(2.15,ax.get_ylim()[1]*0.94,'Month 25:\nmove out,\nfull rental',fontsize=8.5,color='#4b5563',va='top')
        ax.set_title(f"Cumulative Cash Position — THIS HOUSE vs. archetypes\n{name_plot}  ·  {head}",fontsize=12.5,fontweight='bold',pad=12)
        ax.set_xlabel("Years from purchase"); ax.set_ylabel("Cumulative net cash position ($ thousands)")
        ax.yaxis.set_major_formatter(FuncFormatter(lambda v,_:f"${v:,.0f}k")); ax.grid(True,alpha=0.25); ax.set_xlim(0,35)
        ax.legend(title="★ = your house (bold) · archetypes faded",loc='upper left',fontsize=8.5,title_fontsize=9.5,framealpha=0.95)
        plt.tight_layout(); plt.savefig(cf_png,dpi=150,bbox_inches='tight'); plt.close()
        fig,ax=plt.subplots(figsize=(13,8))
        for t,c in zip(ARCH,PALETTE): ax.plot(x,t['nw']/1000,lw=1.7,color=c,alpha=0.5,label=f"Buy {t['name']} (${t['P']:,.0f})")
        ax.plot(x,ARCH[0]['idx']/1000,lw=2.4,color='#374151',ls=(0,(6,3)),label=f"Invest ${cash:,.0f} in S&P 500 + rent")
        ax.plot(x,B/1000,lw=3.4,color='black',zorder=6,label=f"★ THIS HOUSE — ${P:,.0f}")
        ax.axhline(0,color='#111827',lw=1.0); ax.axvline(2,color='#9ca3af',ls='--',lw=1.2); ax.axvline(30,color='#9ca3af',ls=':',lw=1.4)
        ax.set_title(f"After-tax net worth in 2026 dollars — THIS HOUSE vs. archetypes vs. invest-and-rent\n{name_plot}  ·  yr-35 \\${nwB35/1e3:,.0f}k ({"beats" if nwB35>idx35 else "trails"} investing by \\${abs(nwB35-idx35)/1e3:,.0f}k)",fontsize=12,fontweight='bold',pad=12)
        ax.set_xlabel("Years from purchase"); ax.set_ylabel("After-tax net worth if liquidated — 2026 $ (thousands)")
        ax.yaxis.set_major_formatter(FuncFormatter(lambda v,_:f"${v:,.0f}k")); ax.grid(True,alpha=0.25); ax.set_xlim(0,35); ax.set_ylim(bottom=0)
        ax.legend(loc='upper left',fontsize=8.5,framealpha=0.95)
        ax.text(0.995,0.02,f"REAL 2026 $. S&P {SP_NOM*100:.1f}% nom · home {APPR*100:.0f}% nom · rate {rate*100:.2f}% · surplus {surplus_mode}.",transform=ax.transAxes,fontsize=7.5,color='#6b7280',ha='right',va='bottom')
        plt.tight_layout(); plt.savefig(nw_png,dpi=150,bbox_inches='tight'); plt.close()

    # ===================== REPORT =====================
    if a.emit_series:
        import json as _json
        _ix=list(range(0,MONTHS+1,12))   # yearly: months 0,12,...,420 -> years 0..35
        _ser={'cash':[round(float(ucf[i])/1000,1) for i in _ix],     # cumulative cash position (pre-resale), $k
              'nw':[round(float(B[i])/1000,1) for i in _ix],         # after-tax net worth if sold, $k
              'inv':[round(float(ARCH[0]['idx'][i])/1000,1) for i in _ix]}  # invest-down-payment-instead baseline, $k
        print('@@SERIES@@ '+_json.dumps(_ser))
    def M(v): return f"${v:,.0f}"
    units_txt=", ".join(f"unit {i+1} = {b if b>0 else 'studio'}bd ({M(ur)})" for i,(b,ur) in enumerate(zip(beds,unit_rents)))
    if surplus_mode=='invest':
        surp=(f"**INVEST the surplus in the S&P.** Mortgage {rate*100:.2f}% vs expected S&P {SP_NOM*100:.1f}% nominal — "
              f"the S&P clears your rate by more than the ~0.45-pt margin that covers tax + risk. It is close: crossover ≈ {cross*100:.1f}% expected S&P. "
              f"If you expect S&P below that, or markets look richly valued, or you want certainty, redirect surplus to principal (retires this loan ~year {(payoff_pd/12 if payoff_pd else 0):.0f}).")
    else:
        surp=(f"**PAY DOWN the mortgage with the surplus.** Your rate {rate*100:.2f}% meets/beats the expected after-tax S&P, so the guaranteed, "
              f"tax-free return wins. (Crossover ≈ {cross*100:.1f}% expected S&P; retires this loan ~year {(payoff_pd/12 if payoff_pd else 0):.0f}.)")
    if points_help:
        pt_rec=(f"**Optional — buy {best_pt['n']} discount point(s).** Reallocating {M(best_pt['cost'])} of the down payment to points "
                f"(at the assumed −{a.ppr*100:.2f}%/pt → {best_pt['rate']*100:.2f}%) raises move-out cash flow to **{M(best_pt['move'])}/mo** "
                f"(+{M(best_pt['move']-move_rec)}/mo), break-even ~{best_pt['be']:.1f} yrs — good on a 35-yr hold. "
                f"**Confirm the actual point price with your lender first;** points build no equity, so the headline above assumes none.")
    else:
        pt_rec=("**Skip discount points.** At this rate/price the cash does more good as down payment (it also builds equity). "
                "Revisit only if your lender offers a steeper reduction per point.")
    if sustains_full:
        nw_gap=nw20_35-nwB35
        nw_note=(f"actually about {M(nw_gap)} HIGHER on 35-yr net worth (the freed {M(leftover20)} compounds at ~{SP_NOM*100:.1f}%, above your {rate*100:.2f}% rate)" if nw_gap>0
                 else f"about {M(-nw_gap)} lower on 35-yr net worth")
        dp=(f"**Recommended: put the full {M(cash)} toward the purchase as down payment — no points.** "
            f"Cash flow is your #1 priority and you hold separate reserves, so minimizing the loan is the right call. "
            f"Down **{M(d_rec)} ({d_rec/P*100:.0f}%)**, loan **{M(loan_rec)}**, P&I **{M(pi_rec)}/mo** → move-out cash flow **{M(move_rec)}/mo**.\n\n"
            f"The honest trade-off: **20% down ({M(d20)})**, investing the other {M(leftover20)}, gives a far lower move-out cash flow of {M(move_20)}/mo but is {nw_note} ({M(nw20_35)} vs {M(nwB35)}). "
            f"So full-down wins your #1 priority (cash flow); 20%-down narrowly wins priority #2 (net worth). Per your stated priorities, go **full-down** — choose 20%-down only if you'd rather keep {M(leftover20)} liquid and invested.")
    else:
        dp=(f"**⚠ This price does NOT self-sustain even with the full {M(cash)} down.** At the estimated rent, move-out cash flow is **{M(move_rec)}/mo** (a shortfall). "
            f"To make it self-sustain you'd need the price near **{M(P_max)}**, or rent around **{M(rent_needed)}/mo** (vs the {M(rent_total)} assumed), or another unit/bedroom. "
            f"Recommendation: negotiate the price down or don't count on it paying for itself at this rent.")

    R=[]
    R.append(f"# Denver Property Report — {name}\n")
    R.append(f"# ▶ MOVE-OUT (YEAR-{MO/12:g}) CASH FLOW: {M(move_rec)}/mo — {'SURPLUS · self-sustaining' if move_rec>=0 else 'SHORTFALL · NOT self-sustaining'}")
    if move_rec>=0:
        place=f"this house at {M(P)} sits **{M(gap)} BELOW** that ceiling — room to spare"
    else:
        place=f"this house at {M(P)} sits **{M(-gap)} ABOVE** that ceiling — overpriced for its rent"
    R.append(f"# ▶ MOST YOU SHOULD PAY (break-even on rent, full {M(cash)} down): {M(P_max)} — {place}\n")
    R.append(f"*Aim at or below **{M(P_cush)}** to keep a ~$300/mo cushion (not exact break-even). Headline at the recommended financing (full {M(cash)} down, no points). Rent basis: {rent_src}. All long-term figures after-tax, 2026 dollars, 35-year horizon.*\n")
    R.append("---\n## 1 · Inputs & rent")
    R.append(f"- **Price** {M(P)} · **Type** {typ} · **Config** {len(beds)} unit(s): {units_txt}")
    R.append(f"- **Gross market rent, fully rented: {M(rent_total)}/mo** — *{rent_src}.* (Rent is the #1 driver; pull comps for THIS address and re-run with `--rent`.)")
    R.append(f"  - The schedule is whole-UNIT rent by each unit's bedroom count, summed across units — so this config out-rents a same-bedroom-count single home, as it should.")
    other_phrase = (f" + {M(other_rev)} from the other unit(s)") if not is_single else ""
    R.append(f"- While you live there (Yr 1-2): you occupy the largest unit; revenue = {M(co_occ)} roommate{other_phrase} = {M(p1)}/mo. *(roommate income is an assumption — override with --cooccupant; it does NOT affect the move-out headline.)*")
    R.append(f"- Monthly expenses: property tax {M(P*TAX_RATE/12)} ({TAX_RATE*100:.2f}%), insurance {M(ins)}{' (default est.)' if a.insurance is None else ' (yours)'}, HOA {M(hoa)}{' (default)' if a.hoa is None else ' (yours)'}, CapEx {M(capex)}{' (default est.)' if a.capex is None else ' (yours)'}. *(insurance/CapEx are price-scaled estimates calibrated to the v6 archetypes — get a real insurance quote.)*")
    R.append("\n---\n## 2 · Recommended purchase strategy  (priority 1 = cash flow · priority 2 = long-term)")
    R.append(dp)
    R.append(f"\n*How down payment moves the numbers (no points): each +$10k down adds ~${10000*f:,.0f}/mo of cash flow.*")
    R.append("\n| Down | Loan | P&I/mo | Move-out CF | Live-in CF |")
    R.append("|---|---|---|---|---|")
    R.append(f"| 20% ({M(d20)}) | {M(L_20)} | {M(pi_20)} | {M(move_20)}/mo | {M(live_20)}/mo |")
    if sustains_full: R.append(f"| Break-even ({M(d_be)}) | {M(P-d_be)} | {M((P-d_be)*f)} | $0/mo | {M(pack(d_be)[2])}/mo |")
    R.append(f"| **Full {M(cash)} (recommended)** | **{M(loan_rec)}** | **{M(pi_rec)}** | **{M(move_rec)}/mo** | **{M(live_rec)}/mo** |")
    R.append(f"\n{pt_rec}")
    R.append(f"\n{surp}")
    R.append("\n---\n## 3 · Monthly cash flow detail  (at the recommended full-down)")
    R.append(f"- **Move-out (Month 25, after ~2 yrs of rent growth): {'SURPLUS' if move_rec>=0 else 'SHORTFALL'} {M(move_rec)}/mo.**" + ("  Self-sustaining." if move_rec>=0 else "  Does not cover costs — see options above."))
    R.append(f"- Build-up: gross rent {M(rent_total*G2)} → after vacancy/bad-debt/PM {M(rent_total*G2*NETF)}; minus P&I {M(pi_rec)}, tax {M(P*TAX_RATE/12*G2)}, insurance {M(ins*G2)}, HOA {M(hoa*G2)}, CapEx {M(capex*G2)}.")
    R.append(f"- While you live there (Yr 1–2): {M(live_rec)}/mo {'(income)' if live_rec>=0 else '(out of pocket, funded from income as planned)'}.")
    R.append("\n---\n## 4 · Long-term outcome  (35 yrs, after-tax, 2026 $; surplus "+surplus_mode+")")
    R.append(f"- **This house, year 35: {M(nwB35)}.**  Invest the {M(cash)} in the S&P + rent instead: {M(nwR35)}.")
    R.append(f"- → This house **{'BEATS' if nwB35>nwR35 else 'TRAILS'} investing by {M(abs(nwB35-nwR35))}**.  Cash break-even: {('year %.0f'%(ucf_be/12)) if ucf_be else 'beyond 35 yrs'}.")
    R.append("- Rank among the modeled options (yr-35 net worth):")
    for i,(nm,v) in enumerate(ranked): R.append(f"  {i+1}. {nm:24s} {M(v)}"+("   ← this house" if nm.startswith('★') else ""))
    R.append("\n---\n## 5 · Plots\n- Cash flow: "+f"{slug}_cashflow.png"+"\n- Net worth: "+f"{slug}_networth.png"+"\nYour house is the **bold black** line; archetypes faded; dashed = invest-and-rent.")
    R.append("\n---\n## 6 · Assumptions used (v6, hard-coded)")
    R.append(f"S&P 7.5% nom / ~5% real (fwd fcsts 3–6%/decade, reverting; hist ~9.5%) · home appreciation 3% nom / ~0.5% real (natl 2–4%; Denver 25-yr ~4.5%) · rent growth 2.5% · mortgage {rate*100:.2f}% · property tax {TAX_RATE*100:.2f}% · vacancy {(1-NETF/(1-PM)-BADDEBT)*100:.1f}% + bad debt 1% · management 12% · LTCG 15% · recapture 25% · selling 6.5% · inflation 2.5% · cash {M(cash)}.")
    R.append("\n---\n## 7 · Verify before you offer")
    R.append("- **Rent comps for THIS address** (Rentometer/Zillow) — the single biggest driver; re-run with `--rent`. Comps already bake in the things this estimate can't see: **neighborhood** (the largest factor after bedroom count — Denver rents swing 2–3x across neighborhoods), **bathrooms** (`--baths` gives a rough nudge), **square footage, condition/renovation, parking/garage, in-unit laundry, basement, and outdoor space**.")
    R.append("- **Real insurance quote** (Colorado hard market) and **actual HOA**; re-run with `--insurance` / `--hoa`.")
    R.append("- A converted rental needs a **landlord (DP-3) policy + umbrella** (~$50–115/mo more) — not in the base line.")
    R.append("- S&P line is idealized (no volatility/sequence risk); verdict swings on the S&P return and appreciation — treat as ranges.")
    R.append("- ADU value holds only if the unit **already exists and is legal**.")
    report="\n".join(R)
    print(report)
    rp=f"/mnt/user-data/outputs/Denver_Report_{slug}.md"; open(rp,"w").write(report)
    print(f"\n[saved] {rp}\n[saved] {cf_png}\n[saved] {nw_png}")

if __name__=="__main__": main()

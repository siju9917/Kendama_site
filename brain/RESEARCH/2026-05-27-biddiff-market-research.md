# BidDiff — market research (scaffold)

**Status:** **scaffold** — the full evidence-gathering requires
live web research that the next Saturday Routine session will
perform with its web tools (subject to the spend cap being
set). This file lays out exactly what evidence the Research
Quality Critic (#14) demanded so the next session can fill it
in without re-scoping.

**Triggering finding:** P1 from
`products/biddiff/CRITIQUE_LOG.md` (Phase K1, 2026-05-27,
pass 1) — Research Quality Critic raised that BidDiff's claimed
audience and revenue assumptions are undefended by cited
evidence.

---

## 1. Competitor teardown (to fill in)

**Targets** to research with cited URLs:

### Direct competitors — federal-procurement-specific diff tools

- Search the Chrome Web Store for: "RFP diff", "solicitation
  diff", "amendment", "FAR", "SAM.gov", "federal proposal".
  Record extensions found: name, install count, last update
  date, price, review themes, feature set.
- Web search for: "federal solicitation amendment tool",
  "SAM.gov amendment notification", "RFP change detection".
  Note any standalone products.

### Adjacent — general document-diff tools used in this workflow

- Search the Chrome Web Store and the wider web for: "PDF
  diff", "document compare", "Word compare". Record the
  market leaders, their pricing tiers, and how they handle
  the specific federal-procurement edge cases.
  - Litéra Compare
  - Workshare Compare (now Litéra)
  - Microsoft Word "Compare" feature
  - DiffPDF, Diffchecker
  - Adobe Acrobat Compare Files

### Adjacent — capture-management / proposal-management platforms

- Salesforce / GovWin IQ / Deltek GovWin / Capture2 — products
  that include amendment monitoring as one feature among many.
  Pricing models (typically enterprise), feature scope, and
  where BidDiff's individual-tool positioning would or would
  not be felt.

### For each competitor, capture:

- Pricing tiers
- Distribution path (where the buyer encounters them)
- Feature parity with BidDiff (extraction quality, critical
  flagging, exports, history, SAM integration)
- User review themes (what they complain about; what they love)
- Strengths BidDiff cannot match
- Weaknesses BidDiff can credibly exceed

---

## 2. Addressable market sizing (to fill in)

The next session must produce, with cited sources:

- **Number of active federal proposal/capture professionals in
  the U.S.** Sources to check: APMP (Association of Proposal
  Management Professionals) member counts; Bureau of Labor
  Statistics for "proposal manager" occupation; LinkedIn search
  estimates.
- **Number of small/medium federal contractors actively bidding
  on amended solicitations.** Sources: SAM.gov registered
  entity count; the SBA's federal contracting database.
- **Realistic conversion-to-paid rate** for a Chrome extension
  in a B2B-niche-pro vertical. Comparable benchmarks: Toggl,
  RescueTime, Loom (early), Linear (early) — any of those have
  public conversion data?
- **Realistic ARPU** for the target buyer. APMP / GovWin /
  Deltek pricing as ceiling; commodity-tool pricing as floor.

The ceiling-vs-floor estimate constrains
`governance/SCORING_MODEL.md` factor 1 (revenue ceiling) for
BidDiff. A defensible number replaces the current
self-assigned score.

---

## 3. Distribution path analysis (to fill in)

BidDiff lives in the Chrome Web Store. Things to verify:

- **Chrome Web Store search behavior** for the queries a
  federal proposal manager would actually type: "RFP", "SAM",
  "federal proposal", "solicitation", "amendment", "FAR
  clause". Where does BidDiff rank? What are the queries
  that bring intent traffic vs. junk?
- **Web Store listing best practices** — what does the top
  result in each query do well that BidDiff should mirror
  (titles, keywords, screenshots, video demo, social proof)?
- **Off-Web-Store discovery** — is there a meaningful long
  tail of Google searches that lead users to install? What
  content would BidDiff's docs need to satisfy those searches?

---

## 4. Comparable-revenue benchmarks (to fill in)

Per `governance/SCORING_MODEL.md` Section "Honest evidence
tiers," to claim **Proven** tier BidDiff needs to cite at least
one comparable product earning at or near the projected MRR
ceiling. Candidates to research:

- Paid Chrome extensions in B2B niches with public revenue
  reports (Honey, LastPass — too big; smaller indie
  comparables like Toby, MeetSummary, OneTab Pro — pricing
  + estimated revenue if disclosed).
- The IndieHackers, BareMetrics open startups, Microacquire
  databases — any extensions in adjacent verticals with
  documented MRR.
- IDC / Gartner / G2 numbers on the broader
  proposal-management software market.

If no Proven comparable is found, BidDiff's evidence tier drops
to **Plausible** and the score updates accordingly. This is
the rigor 5.7.2 demands — the answer is what the evidence
yields, not what optimism would prefer.

---

## 5. Risk register (preliminary)

- **Audience-vs-scope risk (Ambition Critic):** see
  `human/APPROVALS.md` proposal #1.
- **Domain-coverage risk (Domain-Expert Critic):** the
  critical-rules ruleset is incomplete; validation underway
  via `human/NEED_FROM_HUMAN.md` item 4.
- **SAM.gov platform risk:** SAM.gov's UI / API can change;
  the content script's selectors and the (hypothetical) feed
  product would both feel it.
- **AI commoditization risk:** as LLM document-comparison
  capabilities improve, the basic "what changed" feature
  becomes commodity. BidDiff's defensibility lives in the
  *categorization* and *critical-flagging* — the rules + the
  clause dataset — not in raw diffing.
- **Chrome Web Store policy risk:** the store can change
  pricing / billing rules; the licensing client must remain
  compliant.

---

## 6. Why might BidDiff fail (mandatory, per Section 6 of the
deep-eval requirement)

- **The serious buyer already uses a capture platform** that
  includes amendment monitoring; BidDiff is a tool for the
  segment that *doesn't* have that platform. That segment is
  smaller than the market-leaders-plus-incumbents segment.
- **The "individual proposal manager" segment may not have
  budget authority** — they want the tool but can't approve
  the purchase. This is the classic prosumer-vs-business gap.
- **The critical-rules ruleset is hand-curated.** Without the
  rules-curation infrastructure (logged in `WISHLIST.md`),
  keeping the ruleset current as regulations evolve is a real
  ongoing cost.
- **The Chrome Web Store may be the wrong distribution
  surface.** A VS-Code-like product gallery for federal
  contractors does not exist; the audience may not browse
  the Chrome Web Store for tools.

---

## 7. Evidence tier — preliminary

Currently **Plausible** (sound reasoning, no Proven comparable
cited yet). The next session's research either confirms a
Proven comparable (raising the tier and the score) or
maintains Plausible (lowering the score per the
evidence-quality factor weight).

---

## What lands in `human/APPROVALS.md` after this research

When this file is complete, a follow-up proposal will be posted
giving the human:

- Final score with all sub-scores defensible
- Final evidence tier
- A go/no-go recommendation on whether BidDiff is worth
  continuing or whether one of the WISHLIST candidates should
  preempt it
- The auto-proceed default that applies if no response

The Ambition + Research Quality critics review the proposal
before it posts.

# BidDiff — market research (FILLED IN)

**Status:** **complete** — research performed 2026-06-06 using live
web search. All claims below are cited; confidence level is noted
where evidence is thin.

**Triggering finding:** P1 from
`products/biddiff/CRITIQUE_LOG.md` (Phase K1, 2026-05-27,
pass 1) — Research Quality Critic raised that BidDiff's claimed
audience and revenue assumptions are undefended by cited evidence.

---

## 1. Competitor teardown

### 1a. Direct competitors — federal-procurement-specific diff tools

**Chrome Web Store — no dedicated BidDiff competitor found.**
Multiple search queries across "RFP diff", "solicitation diff",
"amendment", "FAR", "SAM.gov", "federal proposal" returned no
Chrome extensions specifically designed for federal solicitation
amendment comparison. The Chrome Web Store surface for this niche
is essentially unoccupied. (Source: web search 2026-06-06;
confirmed by absence of any product links in search results for
"Chrome Web Store federal solicitation amendment" queries.)

**SAM.gov native alerting:** SAM.gov provides a built-in email
notification system accessible at
https://sam.gov/workspace/profile/feeds/notification that alerts
registered users when watched opportunities receive updates
(including amendments). This is free, but it notifies rather than
diffs — it tells you something changed, not what changed.

**Apify SAM.gov Opportunities Monitor:**
https://apify.com/m_mamaev/sam-gov-opportunities-monitor
A no-code scraper/monitor that watches SAM.gov watchlists for
response deadline, status, attachment, and amendment-like metadata
changes. Positioned as a developer/data tool, not a proposal
manager product. Pricing unclear (Apify consumption-based).

**GovCon API:** https://govconapi.com/
Provides programmatic access to SAM.gov solicitation documents,
amendments, and supporting files via API. Developer tool, not an
end-user diff product.

**VisibleThread VT Docs — "Compare Docs" feature (closest direct
competitor, and it is enterprise-only):**
https://www.visiblethread.com/vt-docs/
VisibleThread is purpose-built for U.S. federal contractors and
is used by 11 of the top 15 U.S. government contractors. It
includes an Amendment Handling / Compare Docs feature that
"itemizes all textual differences side-by-side in a reportable
Excel format" and handles impact analysis. The NASA SEWP VI
case study documented 609 paragraph changes between Amendment 8
and Amendment 11 identified by VT in under 30 seconds.
- **Pricing:** Quote-based, modular, per user, annual subscription.
  No public per-user price. Positioned for enterprise and mid-market
  GovCons. Not accessible for solo proposal managers at a
  commodity price point.
- **Distribution:** Direct sales, conference presence (APMP/SAME),
  word of mouth within large GovCon firms.
- **Weakness BidDiff can exploit:** price exclusion of solo/small
  firm proposal managers; VT Docs is a full platform (compliance
  matrices, shredding, writer tools) — not an installable
  browser tool.
- **Sources:** https://www.visiblethread.com/nasa-sewp-vi/ ;
  https://www.visiblethread.com/rfp-platform-overview/

**GovEagle:**
https://www.goveagle.com/
YC-backed. Word add-in (Microsoft Office, not Chrome). Includes
amendment tracking that "automatically updates your compliance
matrix and proposal outline to reflect the changes." Deeper
feature set than pure diff. No public pricing; enterprise/team
positioning. Distribution via Microsoft Office Marketplace
(https://marketplace.microsoft.com/en-us/product/office/wa200007484).
- **Weakness BidDiff can exploit:** Word-only, not browser-native;
  still requires team/enterprise budget.

**CLEATUS:** https://www.cleat.ai/
AI GovCon platform. Lite plan $80/mo (annual), Essential $300/mo,
extra seats $50/seat/mo. Covers full capture-to-submission
lifecycle including real-time amendment alerts. Too broad for a
dedicated diff use case; positions as a "capture platform" not a
diff tool.

**DeepRFP:** https://deeprfp.com/pricing/
AI proposal tool. Pro $75/user/month, Elite $125/user/month.
RFP/solicitation document analysis focus; amendment diffing not
highlighted as a distinct feature.

**GovDash:** https://www.govdash.com/
Enterprise AI platform. Custom pricing. Raised $30M. 16x customer
growth since Series A. Supports amendment tracking but positioned
at teams and mid-market GovCons. Not solo-friendly on price.

**Capture2Proposal:** https://capture2proposal.com/capture-2-pricing/
Starts at $2,640/year. Full capture management platform. Amendment
monitoring via notifications; document diff is not a highlighted
standalone feature.

**EZGovOpps:** https://ezgovopps.com/home/pricing/
Single-user: ~$2,700/year; Gold (3 users): ~$4,700/year; Platinum
(6 users): ~$6,000/year. Market intelligence focus; amendment
alerts for watched items but no document comparison feature.

**BidPrime / BidNet Direct:** Federal, state, and local bid
aggregation services. Amendment notification via email alerts, no
document diff. BidNet Direct is free to vendors; BidPrime is
subscription-based (exact price not publicly listed; complaints
about high pricing appear in G2 reviews,
https://www.g2.com/products/bidprime/reviews).

### 1b. Adjacent — general document-diff tools

**Microsoft Word "Compare" feature:**
Built into every copy of Microsoft Word (part of Microsoft 365).
Free to existing users. Can compare two Word documents and
highlight differences. Significant limitation: federal solicitation
documents posted on SAM.gov are almost always PDFs. Word Compare
requires conversion to .docx first, introducing formatting
degradation. Does not understand FAR/DFARS clause significance —
every change is equal regardless of legal weight. No integration
with SAM.gov.

**Adobe Acrobat Pro — Compare Files:**
https://www.adobe.com/acrobat/pricing.html
Compare Files available only in Pro (not Standard). Pro:
$19.99/month individual, $22.19/month per license for teams.
Compares PDFs with visual highlights. No federal-procurement
semantic layer — does not flag FAR clause changes as critical vs.
trivial formatting changes. No SAM.gov integration.

**Diffchecker:**
https://www.diffchecker.com/pricing/
Free tier (web). Pro + Desktop: $15/user/month. Enterprise:
$40/user/month. General-purpose text/file diff. No PDF diff in
free tier; PDF comparison requires Pro. No federal-procurement
domain knowledge.

**DiffPDF:**
One-time license, ~$160. Desktop application. PDF page-by-page
comparison. No federal-procurement semantic layer. Requires manual
operation — no SAM.gov integration.

**Litera Compare (formerly Workshare):**
https://www.litera.com/products/litera-compare
Starts at ~$195/user/year (cited by SoftwareFinder/Capterra).
Trusted by 72% of the legal industry. Legal and life-sciences
focused. Compares Word, PDF, Excel, PowerPoint. No
government-procurement-specific ruleset. Positioned at law firms
and pharma, not GovCon proposal managers.

**Draftable:**
https://www.draftable.com/pricing
Business plan: $10.75/user/month. Legal plan: $20.75/user/month.
Trusted by 1,300 law firms. PDF and Word comparison. No
federal-procurement domain layer. Legal focus, not GovCon.
Includes a free online comparison tool with 10 MB / 300-page
limits.

**Summary of competitive whitespace:**
No product in the market today is:
(a) a Chrome extension,
(b) specifically designed for the federal solicitation amendment
    diffing workflow,
(c) priced accessibly for solo/small-firm proposal managers,
(d) with FAR/DFARS clause semantic awareness.
The closest competitor (VisibleThread VT Docs) is enterprise-only,
not browser-native, and costs an order of magnitude more.
General diff tools (Adobe, Word Compare, Diffchecker) have the
mechanics but none of the domain intelligence or workflow
integration. This gap is real but narrow — it depends on whether
solo proposal managers exist in sufficient numbers with the pain
point and budget (see Section 2).

---

## 2. Addressable market sizing

### 2a. Active federal proposal/capture professionals

**APMP membership:**
APMP (https://www.apmp.org/) has nearly **10,500 members** in 27
active chapters worldwide. The APMP-NCA (National Capital Area,
D.C. region) chapter alone has 1,300+ members, the largest single
chapter. APMP's LinkedIn page confirms "nearly 10,500 members."
(Sources: APMP LinkedIn; APMP-NCA 2024 page.)

**APMP compensation survey:**
The 2024-2025 APMP U.S. Compensation Report surveyed 2,269
individuals. 42% identified as Proposal Managers. Two-thirds work
in commercial or U.S. federal government sectors.
(Source: https://www.apmp.org/assets/2024-2025-U.S.-APMP-Compensation-Report-Executive-Summary.pdf)

**BLS occupational data:**
The BLS does not track "Proposal Manager" as a separate SOC code.
The nearest proxy is Management Analysts (SOC 13-1111): ~1.1
million employed in 2024, projected to grow 9% through 2034 with
~98,100 openings/year. The proposal-writing subset is a small
fraction; BLS does not break it out.
(Source: https://www.bls.gov/ooh/business-and-financial/management-analysts.htm)

**LinkedIn job signal:**
LinkedIn shows 12,000+ "government proposal writing" jobs and
5,000+ "proposal writer" jobs in the United States. These are
open postings (not headcount), but signal the approximate scale
of active hiring in the profession.

**Derived addressable headcount:**
APMP's ~10,500 members globally represents the organized,
credentialed tier of the profession. The actual U.S. workforce of
people whose job involves federal proposal management is larger but
unquantified. A conservative working estimate: the APMP federal
segment (roughly one-third of the 10,500 members × 70% U.S.) =
~2,500 organized federal-proposal professionals. The uncredentialed
tail is larger — possibly 3–5x — but is harder to reach and less
likely to pay for premium tools. The realistic TAM for a marketed
solo tool is in the range of **10,000–30,000 U.S. individuals**
(APMP members + active non-APMP proposal managers at SMB
contractors). This is a small market.

**Evidence tier for headcount:** Plausible (APMP membership is
documented; U.S. federal subset and non-APMP tail are estimated).

### 2b. Federal contractors actively bidding

**SAM.gov registrations:**
Approximately **612,000 entities** are registered on SAM.gov
(2023 figure). Of those, roughly **85,000 small businesses win
at least one contract annually** (~14% of registered entities).
(Source: SLED.AI blog citing SAM.gov data;
https://www.sledai.com/blog/government-contracting-statistics/)

**Unique award recipients (FY2024):**
In FY2024, the federal government awarded $773.68 billion to
**108,899 unique companies**. Of those, 78,677 were small
businesses receiving $176.11 billion.
(Source: GovSpend FY24 data,
https://govspend.com/blog/federal-contract-awards-hit-773-68b-in-fy24-small-businesses-see-4b-increase/)

**Contractor pool is shrinking:**
Multiple sources confirm that despite rising spending, the number
of unique contractors winning awards is declining. The contractor
pool is consolidating; small businesses are leaving the federal
market faster than new ones are entering.
(Source: Federal News Network, December 2023,
https://federalnewsnetwork.com/contracting/2023/12/with-a-lot-to-chase-in-2024-fewer-federal-contractors-are-chasing-an-increasing-number-of-federal-dollars/)

**Implication for BidDiff TAM:** Not every SAM.gov registrant is
a realistic BidDiff buyer. The relevant segment is: companies that
actively bid on competitive federal solicitations (not just prime
award recipients — also non-winners who are currently bidding).
A reasonable estimate is 50,000–100,000 active-bidding entities.
Each entity likely has 1–5 proposal staff, not all of whom use a
browser-based tool. This doesn't translate directly to users.

### 2c. Realistic conversion-to-paid rate (B2B Chrome extension)

From aggregated search results across multiple sources:
- B2B freemium conversion: **2–5%** is the industry median
- High-intent, tightly targeted B2B tools: **5–15%**
- Chrome extensions specifically: data points align at 2–3%
  for broad tools; higher for niche tools with clear ROI

**Realistic scenario for BidDiff:**
If BidDiff achieves 5,000 installs (a meaningful milestone for a
niche federal procurement extension with no paid marketing):
- At 3% conversion: 150 paid users
- At 5% conversion: 250 paid users
- At 10% (high-intent, strong word of mouth): 500 paid users

These numbers are small. B2B niche tools can survive and be
profitable at 150–500 users at $15–$25/month; the question is
whether 5,000 installs is achievable without a distribution
flywheel (see Section 3).

### 2d. Realistic ARPU

**Competitive ceiling:**
- GovWin IQ: $13,000–$119,000/year, average ~$29,000/year
  (Vendr transaction data). Per-user effective cost: $50–$100/month
  for small teams.
  (Source: https://www.vendr.com/buyer-guides/govwin-iq)
- EZGovOpps: $2,700/year single user (~$225/month)
- CLEATUS Lite: $80/month (individual)
- DeepRFP Pro: $75/month (individual)
- Capture2Proposal: $2,640/year minimum (~$220/month)

**Adjacent-tool floor:**
- Diffchecker Pro: $15/month
- Adobe Acrobat Pro: $19.99/month
- Draftable Business: $10.75/month

**Defensible ARPU for BidDiff:**
Given the tool is a focused Chrome extension (not a full
platform), pricing above the commodity diff tier ($15–$20/month)
but well below full capture platforms ($75–$225/month) is
defensible. A $20–$35/month range is reasonable. At $25/month
× 200 paid users = $5,000 MRR / $60,000 ARR. At $25/month
× 500 paid users = $12,500 MRR / $150,000 ARR.

**Revenue ceiling estimate:**
Reaching 1,000 paid users would require 20,000–33,000 installs at
realistic conversion rates. That likely represents 1–3 years of
organic growth if the product is well-regarded within the APMP
community. At $25/month, 1,000 users = $25,000 MRR / $300,000
ARR. This is the realistic ceiling for organic growth without
partnership or enterprise tier. With an enterprise/team tier
($100–$200/month for teams of 3–5) the ceiling grows, but so
does the sales effort required.

**Revenue ceiling score (0–10):** **4/10**
Reasoning: The niche is real but small. The ceiling is real but
modest. A $300,000 ARR ceiling in 3 years of sustained effort
is an honest outcome if the product ships, gets distribution,
and executes well — but it is not a $1M+ ARR business without
a significant enterprise layer or a platform expansion. The
score reflects evidence, not aspiration.

---

## 3. Distribution path analysis

### 3a. Chrome Web Store search behavior

No Chrome Web Store extension dominates the relevant search
queries. Searches for "RFP diff", "SAM.gov", "federal proposal",
"solicitation", "amendment" return general document tools or
generic diff utilities — none purpose-built for federal
procurement. This means:

1. There is no established keyword winner to displace.
2. There is also no proven search demand signal on the Chrome
   Web Store specifically for this use case — it may not be
   where proposal managers look for tools.

The more productive keyword angle for Chrome Web Store listing
would be queries proposal managers already use for document work:
"PDF compare", "document diff", "track changes PDF" — then
differentiated by a subtitle like "for federal solicitations /
SAM.gov amendments."

### 3b. Off-Web-Store discovery channels

Evidence from the research suggests proposal managers discover
tools primarily through:
1. **APMP community** — chapter meetings, Slack/forum, job board,
   annual conference (Bid & Proposal Con). APMP has 10,500 members
   and an active community; a well-reviewed tool mentioned in the
   APMP NCA Slack or newsletter gets real exposure.
2. **GovCon industry blogs and aggregators** — GovEagle blog,
   GovDash blog, Procurement Sciences blog, Federal News Network.
   These rank for "federal proposal software" queries.
3. **LinkedIn** — 12,000+ government proposal writing job listings
   suggests active professional community; LinkedIn posts from
   proposal managers about tooling get engagement.
4. **SAM.gov user forums / govcon Reddit** — small but real.
5. **Google SEO** — content targeting queries like "how to compare
   SAM.gov solicitation amendments", "federal RFP amendment
   tracking tool", "SAM.gov amendment notification software"
   could rank quickly in a thin-competition niche.

**Key insight:** Chrome Web Store organic search is likely the
weakest distribution channel for BidDiff. APMP community word of
mouth and GovCon content SEO are the strongest realistic paths to
early users.

### 3c. What successful tools in adjacent niches do right

From GovEagle, GovDash, and VisibleThread's distribution:
- Publish content answering questions proposal managers search
  ("how to acknowledge amendments", "SAM.gov amendment diff",
  "compliance matrix from amendment")
- Presence at APMP Bid & Proposal Con
- Integrate with tools proposal managers already use (Word,
  SAM.gov, SharePoint)
- Social proof from named federal contractors (security-conscious
  audience; anonymous testimonials are discounted)

---

## 4. Comparable revenue benchmarks

### 4a. B2B Chrome extensions with public revenue data

**GMass** (cold email Chrome extension):
- 2024 revenue: $8.6M (up from $5.4M in 2023)
- 500,000+ user signups
- $200K+ MRR at peak
- Source: GetLatka, https://getlatka.com/companies/gmass
- **Comparability to BidDiff:** Low. GMass operates in a
  mass-market, viral-friendly, billion-person email market.
  BidDiff's TAM is orders of magnitude smaller.

**Easy Folders / Similar chrome extension:**
- 6 months post-launch: $3,700 MRR, $42,000 total revenue
- Source: IndieHackers, https://www.indiehackers.com/product/easy-folders/
- **Comparability:** Medium. Single-developer, niche productivity
  tool. Shows what is achievable at a niche extension with good
  product-market fit. BidDiff's niche is smaller and harder to
  reach.

**Micro SaaS chrome extension (9K MRR):**
- IndieHackers weekly: a Chrome extension making $9K MRR
  (~$108K ARR)
- Source: https://www.indiehackers.com/post/this-week-in-micro-saas-chrome-extension-making-9k-mrr-and-more-ce34f97ab7
- **Comparability:** Medium-high. This is the realistic range for
  a well-executed niche B2B Chrome extension: $5K–$15K MRR is a
  credible 2-year outcome for a focused solo product.

**Starter Story aggregate:**
- Successful extensions average $862,000 annual revenue across
  the whole distribution, but the top 1% (e.g., Grammarly,
  GMass) skew this heavily upward.
- Top 10% of paid extensions: $1K+/month
- Top 1%: $50K+/month
- Source: https://www.starterstory.com/ideas/chrome-extention-building-business/profitability

**Honest conclusion for BidDiff:** No comparable Proven benchmark
exists for a federal-procurement-specific B2B Chrome extension
because none has been built and publicly reported on. The closest
comparable class is "niche B2B tools with a small, high-intent
audience" — which yields $3K–$15K MRR as a realistic 12–24 month
target range for a well-executed product. BidDiff's evidence
tier is therefore **Plausible** (not Proven), per the scoring
model's definition.

### 4b. Proposal management software market (broader context)

Multiple market research firms (Fortune Business Insights, Verified
Market Research, Future Market Insights) estimate the global
proposal management software market at:
- **$2.2–$3.3 billion in 2024–2025**
- Growing at 10–12% CAGR
- Projected to reach $7–$8 billion by 2034–2035
(Sources: https://www.fortunebusinessinsights.com/proposal-management-software-market-108680 ;
https://www.verifiedmarketresearch.com/product/proposal-management-software-market/ ;
https://www.marketresearchfuture.com/reports/proposal-management-software-market-32872)

**Caveat:** These market research numbers are from secondary
research shops whose methodology is opaque and whose numbers
frequently diverge. They provide directional confirmation that
proposal management software is a real, multi-billion-dollar
market, but do not provide defensible TAM for BidDiff specifically.
BidDiff is a sub-category of sub-category (federal-only,
amendment-diff-only, individual-not-team). The addressable slice
of the $3B market for BidDiff is likely well under 0.1% —
consistent with the headcount TAM analysis above.

---

## 5. Risk register (updated with evidence)

**Existing risks confirmed by research:**

- **"The serious buyer already uses a capture platform"** —
  CONFIRMED and quantified. VisibleThread, GovEagle, GovDash,
  CLEATUS all include amendment tracking or comparison as a feature.
  Any GovCon spending $75/month or more per seat is likely already
  served. BidDiff's addressable segment is the gap: solo/SMB
  proposal managers who cannot justify $75–$225/month for a
  full platform.

- **"Individual proposal managers may not have budget authority"**
  — CONFIRMED as plausible risk. APMP compensation data shows
  42% of respondents are Proposal Managers, and 41% work for
  companies with >$1B revenue. A Proposal Manager at a large
  GovCon is an employee who submits expenses — the $25/month
  is approvable, but the purchase path goes through IT/procurement
  and takes time. At SMBs, the same person who needs the tool
  often IS the budget authority, making purchase easier.

- **Chrome Web Store as wrong distribution surface** —
  STRENGTHENED by research. No proposal-manager-specific
  extension has achieved meaningful market penetration via the
  Web Store. The community channels (APMP, GovCon blogs) are
  likely more effective.

**New risks surfaced by research:**

- **Contractor base is shrinking:** The number of unique federal
  contractors winning awards is declining. Small businesses are
  leaving the federal market. The TAM may contract over the next
  5 years rather than grow.
  (Source: Federal News Network, Dec 2023)

- **AI commoditization is faster than expected:** GovDash, GovEagle,
  CLEATUS, and DeepRFP all incorporate AI-powered amendment analysis
  as a bundled feature. The "what changed and does it matter" problem
  is being absorbed into larger platforms rapidly (2024–2026).
  A standalone diff tool risks being bundled out of existence.

- **DOGE/budget risk:** Federal contracting spending declined slightly
  in FY2024 (-$22.5B vs FY2023). DOGE-era federal workforce
  reductions in 2025-2026 create uncertainty for the number of
  active federal contractors bidding on new work.

---

## 6. Why BidDiff might fail (evidence-grounded analysis)

**1. The TAM is small and the conversion math is hard.**
10,000–30,000 reachable U.S. federal proposal managers.
At 5,000 installs (optimistic for a niche Chrome extension with no
paid marketing), 3–5% conversion = 150–250 paid users. At $25/month
= $3,750–$6,250 MRR. This is a side-project level of revenue, not
a venture-scale product. To reach $25K MRR requires 1,000 paid
users — probably 20,000–33,000 installs — which requires years
of sustained APMP-community investment or a surprising organic
hit. No prior evidence that this niche generates viral installs.

**2. Every serious GovCon tool converges on the same feature.**
VisibleThread, GovEagle, GovDash, CLEATUS, and DeepRFP all do
some version of amendment tracking. The enterprise tier of the
TAM is already served. BidDiff must win and hold the SMB/solo
segment before those platforms extend downmarket with freemium
plans — which GovDash's $30M raise in funding positions them
to do.

**3. The distribution channel mismatch is a structural problem.**
Proposal managers do not browse the Chrome Web Store for
procurement tools. They discover tools through APMP, govcon
blogs, LinkedIn, and peer recommendations. This means BidDiff
needs to be a community product, not a Web Store product — which
requires founder presence in the APMP community, content
marketing, and conference attendance. These are real costs
(time, travel) that this factory does not currently bear.

**4. PDF-first workflow creates extraction risk.**
Federal solicitations are PDFs. PDF text extraction for diff
purposes has known failure modes: tables, embedded headers,
multi-column layouts, scanned documents. The product must handle
these reliably or proposal managers will distrust its output on
high-stakes bids. One missed critical change = disqualified
proposal = the user blames the tool and churns, telling their
colleagues. Reputation risk is asymmetric in this niche.

**5. Federal procurement is shrinking and increasingly IDIQ-heavy.**
Fewer unique solicitations, more task order work under existing
vehicles. The raw count of new amended solicitations on SAM.gov
may decline in DOGE-era federal spending contraction, reducing
the frequency of the core use case.

**6. No evidence of Chrome Web Store PMF in this niche.**
The research found zero Chrome extensions with meaningful install
counts or revenue in the federal proposal management space. This
is either a whitespace opportunity (no one has built the right
product) or a dead end (the audience does not buy via this
channel). The data cannot distinguish between these two
explanations. The risk is real.

---

## 7. Evidence tier and revenue ceiling score

**Evidence tier: PLAUSIBLE** (maintained from scaffold)

Reasoning:
- Sound market logic: the problem is real, the workflow gap is
  documented, no direct competitor exists.
- No Proven comparable found: no Chrome extension in this exact
  niche with documented revenue was identified. GMass and Easy
  Folders are general productivity tools in larger markets.
  Proven tier requires a cited comparable at or near projected
  MRR ceiling in the same niche — that comparable does not
  exist because this niche has not been successfully monetized
  via a Chrome extension before.
- The $5K–$15K MRR outcome range (24-month) is Plausible but
  not Proven.

**Revenue ceiling score: 4 / 10**

Sub-justification:
- TAM headcount ceiling: ~30,000 reachable individuals (small)
- Realistic install ceiling (organic, no paid): 5,000–15,000
- Realistic conversion at 3–5%: 150–750 paid users
- Realistic ARPU: $20–$35/month
- Realistic ARR ceiling (2-year organic): $45K–$315K
- Upside scenario (enterprise tier, APMP partnerships, 1,000+ paid
  users): ~$300K ARR
- 4/10 reflects: real but modest ceiling; achievable revenue is
  legitimate micro-SaaS territory, not a venture-scale product.
  Score would rise to 6/10 with evidence of community distribution
  traction (e.g., APMP chapter endorsement, 500+ installs in 90
  days post-launch).

---

## 8. Plain-text summary (for paste into PORTFOLIO.md or APPROVALS.md)

BidDiff deep-research findings (2026-06-06):

The federal solicitation amendment diff niche is real, underserved
on the Chrome Web Store (zero direct competitors found), and has
a documented pain point (amendment acknowledgment failures cause
proposal disqualifications). However, the TAM is small (est.
10,000–30,000 reachable U.S. federal proposal managers; 108,899
unique firms received federal awards in FY2024), the Chrome Web
Store is likely the wrong primary distribution surface (APMP
community and GovCon blogs are where tools spread in this niche),
and every serious capture management platform (VisibleThread,
GovEagle, GovDash, CLEATUS) is converging on amendment tracking
as a bundled feature — leaving BidDiff to win only the solo/SMB
segment the enterprise tools price out. The realistic 2-year ARR
ceiling via organic growth is $45K–$315K (150–1,000 paid users
at $25/month), with no Proven comparable (the Plausible evidence
tier is maintained). The revenue ceiling score is 4/10 per the
SCORING_MODEL. The top failure risks are: (1) the TAM-to-install
conversion math yields only side-project revenue without a
community distribution flywheel, (2) AI-powered amendment
analysis is being absorbed into larger platforms rapidly, and
(3) the federal contracting base is shrinking in the DOGE era.
BidDiff is worth continuing only if: (a) the product ships
quickly and cheaply, (b) distribution investment is in APMP
community presence not Web Store SEO, and (c) an enterprise/team
tier at $100–$200/month is built early to lift the revenue ceiling.
Without those conditions, BidDiff is a defensible but modest
micro-SaaS, not the portfolio's highest-priority asset.

---

## Sources cited in this document

- APMP membership: https://www.linkedin.com/company/apmp (10,500 members)
- APMP-NCA chapter: https://apmpnca.org/2024/
- APMP 2024-2025 Compensation Report: https://www.apmp.org/assets/2024-2025-U.S.-APMP-Compensation-Report-Executive-Summary.pdf
- BLS Management Analysts: https://www.bls.gov/ooh/business-and-financial/management-analysts.htm
- LinkedIn job postings (government proposal writing): https://www.linkedin.com/jobs/government-proposal-writing-jobs
- SAM.gov entity count (~612K): referenced at https://www.sledai.com/blog/government-contracting-statistics/ citing SAM.gov data
- FY2024 award data (108,899 companies): https://govspend.com/blog/federal-contract-awards-hit-773-68b-in-fy24-small-businesses-see-4b-increase/
- Federal contractor consolidation: https://federalnewsnetwork.com/contracting/2023/12/with-a-lot-to-chase-in-2024-fewer-federal-contractors-are-chasing-an-increasing-number-of-federal-dollars/
- GovWin IQ pricing: https://www.vendr.com/buyer-guides/govwin-iq ($13K–$119K/year, avg $29K)
- EZGovOpps pricing: https://ezgovopps.com/home/pricing/ ($2,700/year single user)
- CLEATUS pricing: https://www.cleat.ai/pricing (Lite $80/mo)
- DeepRFP pricing: https://deeprfp.com/pricing/ ($75/user/month Pro)
- Capture2Proposal pricing: https://capture2proposal.com/capture-2-pricing/ ($2,640/year)
- Adobe Acrobat Pro pricing: https://www.adobe.com/acrobat/pricing.html ($19.99/month)
- Diffchecker pricing: https://www.diffchecker.com/pricing/ ($15/month Pro)
- Draftable pricing: https://www.draftable.com/pricing ($10.75/user/month Business)
- Litera Compare pricing: https://softwarefinder.com/legal/litera-compare (~$195/user/year)
- VisibleThread (VT Docs, Compare Docs feature): https://www.visiblethread.com/nasa-sewp-vi/
- GovEagle amendment tracking: https://www.goveagle.com/blog/ai-proposal-writing-tools-government-contractors
- GovDash $30M raise: https://www.govdash.com/blog/govdash-raises-30m-in-new-funding
- GMass 2024 revenue ($8.6M): https://getlatka.com/companies/gmass
- Easy Folders MRR: https://www.indiehackers.com/product/easy-folders/6-months-post-launch-my-chrome-extension-has-hit-3-700-in-mrr-and-42-000-in-total-revenue--O3qs28VAnAkcJw0j--M
- Chrome extension $9K MRR: https://www.indiehackers.com/post/this-week-in-micro-saas-chrome-extension-making-9k-mrr-and-more-ce34f97ab7
- Starter Story chrome extension profitability: https://www.starterstory.com/ideas/chrome-extention-building-business/profitability
- B2B freemium conversion benchmarks: https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/
- Proposal management software market size: https://www.fortunebusinessinsights.com/proposal-management-software-market-108680 ($3.26B in 2025)
- APMP / Responsive 2024 State of Strategic Response Management: https://www.businesswire.com/news/home/20240731807480/en/Research-Sponsored-by-Responsive-and-APMP-Reveals-That-Organizations-Embracing-Strategic-Response-Management-Are-Driving-Outsized-Results
- Apify SAM.gov monitor: https://apify.com/m_mamaev/sam-gov-opportunities-monitor
- GovEagle Microsoft Office Marketplace: https://marketplace.microsoft.com/en-us/product/office/wa200007484

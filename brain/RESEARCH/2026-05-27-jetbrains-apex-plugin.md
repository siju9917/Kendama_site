# Deep evaluation — JetBrains / Salesforce Apex plugin

**Status:** **scaffold** — the full evaluation requires live web
research that the next Saturday Routine session will perform with
its web tools. This file lays out the *structure* the evaluation
must satisfy per `governance/SCORING_MODEL.md` Section "The
deep-evaluation requirement," and records what is currently
known. The next session fills in the cited research and posts the
completed proposal to `human/APPROVALS.md`.

**Idea:** A paid JetBrains IDE plugin (IntelliJ IDEA / WebStorm /
PhpStorm / Rider — and most directly the Apex / Salesforce
Illuminated Cloud ecosystem) that addresses a sharp pain point in
Apex development. Specific sub-problem to validate during deep
evaluation.

**Source:** Prior research; ranked #1 in `brain/RANKING.md` as
the lead candidate.

**Provisional evidence tier:** Proven (comparable paid IntelliJ
plugins exist with documented revenue). Tier will be reaffirmed
or revised in the deep evaluation.

---

## 1. Competitor teardown — to fill in next session

The next session must produce, with cited URLs:

- The dominant Apex-on-JetBrains incumbent: **Illuminated Cloud
  2** (pricing, version, JetBrains Marketplace install count,
  user reviews and pain-point themes).
- Any other paid Apex tooling: Salesforce Inspector Reloaded,
  ApexCharge, etc. — feature comparison.
- Salesforce's own first-party tooling on VS Code (the Salesforce
  Extension Pack) — what it covers, what gaps it leaves on
  JetBrains specifically.
- The 3-5 highest-grossing paid IntelliJ plugins in adjacent
  ecosystems (Scala, Kotlin, Python "Pro"-level features) as
  pricing comps for "what serious devs in a niche language
  actually pay."

## 2. Realistic revenue model — to fill in next session

The next session must produce:

- Pricing strategy: subscription vs. perpetual; annual vs.
  monthly; individual vs. team; trial structure.
- Conversion assumptions tied to JetBrains Marketplace
  install-to-purchase rates (cite source).
- Comparable benchmarks: 2-3 paid plugins of similar scope and
  their disclosed revenue or active-paid-user counts (cite
  source).
- Ceiling vs. floor estimate.

## 3. Distribution analysis — to fill in next session

- JetBrains Marketplace mechanics: how a paid plugin gets listed,
  ranking signals, search behavior, fee split (cite the official
  JetBrains plugin-developer revenue terms).
- The Apex developer audience size on JetBrains specifically
  (versus on VS Code, which is bigger). Realistic addressable
  market.
- Whether the product can also list in adjacent IDE marketplaces
  (e.g., as a CLI or VS Code companion).

## 4. Build-effort estimate

Initial decomposition (refined during the deep eval):

- **Phase 1:** Plugin scaffold (IntelliJ Platform SDK + Gradle),
  marketplace metadata, billing-integration stub.
- **Phase 2:** The actual feature(s) — to be defined after the
  competitor teardown identifies the sharpest gap. Likely
  candidates from prior research: Apex SOQL refactoring,
  multi-org diff, governor-limit static analysis, deployment
  diff.
- **Phase 3:** License client (offline-trial + key validation,
  modeled on the BidDiff licensing pattern under
  `products/biddiff/src/core/licensing/`).
- **Phase 4:** Telemetry (opt-in, no document content — same
  privacy posture as BidDiff).
- **Phase 5:** Polish and ship-gate.

Cycle estimate to fill in next session after the competitor
teardown clarifies feature scope.

## 5. Risk register

- **Salesforce / JetBrains tooling roadmap:** the platform owner
  could obviate the plugin by adding the feature first-party.
- **VS Code drift:** Apex developers might consolidate onto VS
  Code, eroding the JetBrains-specific niche.
- **Illuminated Cloud bundling:** the incumbent could absorb the
  feature into its existing paid plugin at marginal cost to the
  user.
- **AI commoditization:** A model that's good at Apex makes some
  static-analysis features generic. The plugin must compound,
  not replicate, what an LLM does.
- **Build dependency:** JetBrains Platform SDK changes between
  major IntelliJ versions; the plugin needs a forward-compat
  strategy from day one.

## 6. Why this might fail (mandatory)

- **The Apex-on-JetBrains audience may be too small to support a
  product at the projected ceiling.** The deep evaluation must
  honestly estimate it, not assume it.
- **The specific sub-problem isn't yet chosen.** "An Apex plugin"
  is not a product. The deep eval must pick a specific feature
  that solves a concrete pain Illuminated Cloud does not, and
  defend that choice.
- **JetBrains' fee split and listing rules may be unfavorable**
  versus, e.g., a standalone web SaaS — the deep eval verifies
  the math holds.
- **Salesforce's own tooling decisions are exogenous risk** the
  factory has no control over.
- **An autonomous agent may struggle to acquire deep Apex domain
  fluency.** The deep eval honestly assesses build feasibility.

## 7. Evidence tier — to be confirmed in deep evaluation

Provisional: **Proven** (the comparable-revenue benchmark from
section 1 will confirm or revise). If section 1 cannot identify
a paid plugin in this exact niche with documented revenue at the
projected ceiling, the tier drops to **Plausible** and the score
drops accordingly per `governance/SCORING_MODEL.md`.

---

## Scoring (preliminary — full sub-scores after deep evaluation)

| Factor | Weight | Provisional score | Notes |
|---|---:|---:|---|
| Revenue ceiling | 18 | _tbd_ | Pending revenue model |
| Probability of reaching ceiling | 14 | _tbd_ | Pending comparable benchmarks |
| Distribution quality | 14 | 9 | JetBrains Marketplace is a real distribution surface with intent traffic |
| Maintenance fit | 10 | 8 | Plugin updates tied to IntelliJ releases |
| Build feasibility | 10 | _tbd_ | Pending Apex domain assessment |
| Self-serve monetization | 8 | 9 | JetBrains handles billing |
| Defensibility | 8 | _tbd_ | Depends on which feature is chosen |
| Evidence quality | 10 | _tbd_ | See section 7 |
| Strategic fit | 8 | 7 | Builds the first "marketplace-distributed paid plugin" playbook — compounds for future products |

Total once filled in.

---

## What the proposal in APPROVALS.md will contain

When the next session completes this evaluation, the proposal
posted to `human/APPROVALS.md` will include:

- One-paragraph idea summary
- The chosen specific sub-feature (not "an Apex plugin"; a named
  feature)
- Evidence tier (Proven / Plausible / Speculative) with
  justification
- Total score and sub-scores
- Deep-eval summary citing this file
- Auto-proceed deadline (7 days default)
- The hard requirements (distribution, monetization, build
  feasibility, spend cap) all checked

The human's role is the fast yes / no / redirect.

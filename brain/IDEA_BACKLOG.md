# IDEA_BACKLOG.md — every product idea, ranked

> Every candidate product idea ever generated. Each carries its
> current score from `governance/SCORING_MODEL.md` and a link to
> its deep evaluation under `brain/RESEARCH/` if one exists.
>
> The top **unbuilt and approved** idea is always what the BUILD
> loop picks up next. "Approved" means a human entry in
> `human/APPROVALS.md` (or the configured auto-proceed window has
> elapsed without a `no`).

The ranking and reasoning live in `brain/RANKING.md`.

---

## Seeded backlog (prior-research ideas to deep-evaluate)

These ideas come from the human's prior research and are seeded
here. **None of them is approved yet.** Each needs its deep
evaluation per Section 3.3 before being eligible for the BUILD
loop. The factory works the list top-down, deep-evaluating one
per cycle and posting the proposal to `human/APPROVALS.md`.

### Active candidates (deep evaluation pending)

| Rank | Idea | Source | Evidence tier (provisional) | Deep eval | Approval status |
|---:|---|---|---|---|---|
| 1 | **JetBrains / Salesforce Apex plugin** — paid plugin in JetBrains Marketplace serving Apex developers. Marketplace distribution; JetBrains handles billing; defined niche. | Prior research. | Proven (provisional) | scaffold at `brain/RESEARCH/2026-05-27-jetbrains-apex-plugin.md` | not yet |
| 2 | **FAR/DFARS clause-currency MCP server** — MCP server that surfaces current FAR/DFARS clause text and changes to AI agents and IDEs. Distribution via the MCP registry; demand from any team building automation on federal procurement. | Prior research. | Plausible | scaffold at `brain/RESEARCH/2026-05-30-far-dfars-mcp-server.md` (first-principles sections filled; cited §1/§2 cap-gated) | not yet |
| 3 | **In-browser PDF text extractor (WASM)** — drop-in library for Chrome MV3 / web contexts: ligature normalization, hyphenation joining, layout-aware column detection, page rotation, encrypted-PDF detection. Distribution: npm + JSR. | `brain/WISHLIST.md` 2026-05-27 #1 (BidDiff friction). | Plausible | scaffold at `brain/RESEARCH/2026-05-30-inbrowser-pdf-extractor.md` (first-principles; reads as a *byproduct extraction*, not a lead product) | not yet |
| 4 | **SAM.gov amendment monitoring feed** — RSS / email / Slack / webhook notifications when a watched federal solicitation is amended, with the critical-change summary inline (re-uses BidDiff's engine + clause dataset). | `brain/WISHLIST.md` 2026-05-27 #2. | Plausible→weak | scaffold at `brain/RESEARCH/2026-05-30-sam-amendment-feed.md` — **flagged: a standalone SaaS feed FAILS the distribution hard filter + maintenance-fit; best as a BidDiff companion / Slack app** | not yet |
| 5 | **Critical-change rules curation DSL** — lets domain experts define critical-change rules in a structured DSL; exports runtime-loadable rule sets for any regulated-document-diff product (federal procurement, FDA filings, securities filings, building codes). | `brain/WISHLIST.md` 2026-05-27 #3. | Speculative | scaffold at `brain/RESEARCH/2026-05-30-critical-rules-dsl.md` — **finding: infrastructure, not a standalone product; build the rule-pack loader inside the engine, don't sell the DSL** | not yet |

### Wishlist-sourced candidates

The three rows immediately above (ranks 3-5) are
wishlist-sourced — each came from a friction moment captured
during BidDiff work and logged in `brain/WISHLIST.md`. The PLAY
loop will continue producing them.

**Dev-tooling candidate — jsdom WCAG contrast checker** (WISHLIST
2026-05-30; scaffold at `brain/RESEARCH/2026-05-30-jsdom-contrast-checker.md`).
The most genuinely-original idea of the cycle (born from real friction
— it's the exact gap that makes BidDiff's a11y contrast P2
browser-gated). Strong technical wedge (axe documents it can't do
contrast in jsdom; the color question needs the cascade, not layout),
but the **weakest revenue case** (likely OSS for adoption/credibility).
Honest disposition: build minimally to dogfood BidDiff's a11y P2 and
open-source it — not a revenue lead. Evidence tier Speculative→Plausible.

### Market-signal-triggered candidates

Empty at bootstrap. The RESEARCH loop populates
`brain/MARKET_SIGNALS.md` and each signal then becomes a
candidate.

### Derivative-reasoning candidates

**Core insight (2026-05-30, first-principles ideation — zero-cost,
cap-independent):** BidDiff's real, reusable competency is **"diff
two versions of a structured document and classify which changes are
*materially critical* to a specific professional."** That capability
is *horizontal* — the federal-solicitation specifics are one rule
pack on top of a generic engine (align → classify → flag-critical →
report-never-advise). The same engine, with a different rule pack and
a different distribution surface, is a different product in a
different market. This is the derivative-reasoning family the spec
(PART 3.1) asks the factory to generate. Each candidate below reuses
BidDiff's engine (high strategic fit) but reaches a distinct buyer
through a distinct marketplace (distribution-without-marketing).

Provisional sub-scores use `governance/SCORING_MODEL.md` factors
(Rev ceiling / Prob / Distribution / Maint / Build / Self-serve /
Defensibility / Evidence / Strategic). They are **first-principles
estimates pending the cited deep-evaluation**, which is the only part
gated by the unset spend cap. None is approved.

| Idea | Distribution surface | Buyer | Evidence (prov.) | Strategic fit | Notes |
|---|---|---|---|---|---|
| **D1. `regdiff` — open-core regulated-document diff library (npm + JSR)** | npm/JSR keyword SEO ("redline", "amendment diff", "document diff") + docs-site SEO | Devs at GovTech / LegalTech / compliance vendors who need amendment diffing + critical-change rules and don't want to build alignment from scratch | Plausible | **High (10)** — directly extracts BidDiff's engine; the rank-5 rules DSL is its rule layer | MIT core + paid commercial rule-packs / hosted self-serve API (Stripe). Weakness: libraries monetize weakly without a hosted tier; npm SEO is discovery but not buy-intent traffic. |
| **D2. `clauseguard` — GitHub Marketplace app (read-only) flagging stale/changed regulatory-clause references in repos** | GitHub Marketplace (intent traffic from compliance-conscious orgs) | Eng/compliance teams whose code, docs, or config cite FAR/DFARS/HIPAA/PCI/SOC2 controls | Plausible | High (9) — reuses the clause dataset + critical-change engine | GitHub **App** (webhooks), NOT Actions — permitted by GUARDRAILS #1's read-only carve-out and IDEA_BACKLOG standing category #4. Self-serve via GitHub Marketplace billing. Weakness: needs a hosted webhook receiver (maintenance fit ↓). Moat: the curated clause dataset. |
| **D3. JetBrains plugin for protobuf / gRPC breaking-change diffing** | JetBrains Marketplace (proven paid-plugin revenue + intent traffic) | Backend/platform engineers maintaining `.proto` contracts across services | Proven-leaning (incumbent **buf.build** proves the pain + willingness to pay; an IDE-native experience is the wedge) | Medium (7) — reuses the "classify breaking vs safe changes" core, different parser | Self-serve via JetBrains billing. Diversifies the JetBrains-marketplace bet beyond rank-1 Apex. Risk: Buf is a strong incumbent (compete on IDE-native immediacy, not parity). |
| **D4. Shopify app: theme/liquid change-risk diff before publish** | Shopify App Store (strong intent + a Proven $20k+/mo revenue category) | Shopify merchants / agencies editing themes who fear breaking checkout, cart, tracking pixels, structured data | Plausible | Medium (8) — reuses diff + critical-classification, new "risky-edit" rule pack | Self-serve via Shopify Billing API. Highest revenue ceiling of the family. Weakness: hosting + Shopify API-version churn (maintenance fit ↓); furthest from BidDiff's domain. |
| **D5. OpenAPI / API-spec breaking-change diff — VS Code extension + CI-free check** | VS Code Marketplace (largest dev marketplace) | API teams reviewing `openapi.yaml`/`swagger` changes for breaking edits | Proven-leaning (oasdiff / openapi-diff exist as CLIs — proves demand; an IDE-native, classified experience is the wedge) | Medium (7) — same breaking-change classification core | Monetization DIY via external license server (VS Code has no built-in billing) — self-serve but more build. Distribution excellent. |
| **D6. `terraform plan` destructive-change classifier — VS Code extension (NEW 2026-05-30 evening)** | VS Code Marketplace (largest dev marketplace; "terraform" is a top-searched tag) | Platform/DevOps engineers who fear `terraform apply` — they read a plan's `~`/`-/+`/`-` lines and must spot the *destructive* ones (resource REPLACEMENT, data-store deletion, security-group widening, IAM broadening) under change-window pressure | **Proven-leaning** — the pain is acute and universal (every `apply` is a held breath), and adjacent paid tooling exists (Spacelift, env0, Terraform Cloud's plan-policy) proving willingness to pay; the wedge is a *free/cheap, on-device, IDE-native "what in this plan is dangerous?"* classifier with zero CI/cloud setup | High (9) — textbook fit for the horizontal capability: parse `terraform plan` (or the `-json` plan) → classify each change's criticality (replace/destroy/privilege-widening = CRITICAL; in-place attribute tweak = NORMAL) → report, never advise. New rule-pack (HCL/plan-JSON anchors + a destructive-action ruleset), same engine + the on-device-trust wedge (infra plans are sensitive — staying local clears the security review) | Self-serve: VS Code has no built-in billing → DIY license server (like D5), or a generous-free + paid-team model. Strong: distribution + Proven-leaning pain + on-device wedge + high strategic fit. Weakness: HCL/plan parsing is a real (but well-documented, `terraform show -json` is stable) rule-pack build. |

**D6 added (2026-05-30 evening, first-principles ideation per 5b/5.7.6):** the
`terraform plan` destructive-change classifier. It is arguably the STRONGEST
new derivative on the cap-independent factors — it stacks (a) VS Code's
largest-marketplace distribution, (b) a Proven-leaning, acute, universal pain
(`terraform apply` dread), (c) the on-device-trust wedge (infra plans are
sensitive, staying local clears the security review — the exact AGAINST-server
argument from the on-device insight below), and (d) high strategic fit (pure
"diff two states → classify criticality → report" reuse, just a new HCL/plan
rule-pack). It belongs in the cap-unblocked deep-eval order near D2/D5, ahead
of the server-side D4. Provisional structural sub-score (same 6 cap-independent
factors as RANKING.md): Dist 9, Maint 9 (on-device, no hosting), Build 7
(HCL/`terraform show -json` parsing is the work), Self-serve 5 (VS Code DIY
billing), Defens 6 (incumbents exist but none is free+on-device+IDE-native),
Strategic 8 → partial 438/580 (arithmetic-verified), in the same band as MCP (436) and just behind D3 (448)/rank-1 (460)/D2 (474). Deep-eval scaffold: `brain/RESEARCH/2026-05-30-terraform-plan-classifier.md`.

**Deep-eval scaffolds (2026-05-30):** D2
(`brain/RESEARCH/2026-05-30-clauseguard-github-app.md`), D4
(`...-shopify-theme-risk-app.md`), and D3+D5
(`...-ide-breaking-change-diff.md`) now have first-principles
scaffolds. D1 (the `regdiff` library) is covered by the extraction
map in `brain/PLAYBOOKS/...` and is treated as byproduct-infrastructure,
not a lead product. The full candidate set (5 seeded + the D-family) is
now first-principles deep-eval-ready; only the cited competitor/revenue
research remains, gated on the spend cap.

**Why this family is strong strategically:** it converts BidDiff from
"one product" into a **reusable engine + a portfolio of rule-pack
products**, each compounding the same code and the same critique
playbook. The Ambition Critic's "what would not appear on a listicle"
test: D1/D2 (regulated-reference tooling) and the unifying
"critical-change diff as a horizontal capability" framing are
genuinely non-obvious and not listicle picks.

**Next (when the cap is set):** deep-evaluate D1 and D2 first (highest
strategic fit + clearest distribution), then D3–D5. Until then they
stay first-principles-ranked candidates, not approved builds.

#### Portfolio-sequencing insight (2026-05-30, first-principles)

The D-family is not five independent products — it is **one shared
engine (D1 `regdiff`) plus N rule-packs** (D2–D5, rank-2, and BidDiff
itself). That reframes the optimal build sequence and is a genuine
strategic, not just listing, decision:

- **The compounding play:** extract the critical-change diff engine
  from BidDiff into `regdiff` *as reusable infrastructure first*, then
  each subsequent product (clauseguard, the MCP server, the protobuf
  plugin, the Shopify app) is "engine + a rule-pack + a distribution
  shell." Marginal build cost per new vertical drops sharply; the
  critique playbook (`brain/PLAYBOOKS/...`) already exists to compound
  the *process* the same way.
- **But — the hard filters still gate the order.** Build-sequencing
  must not override `governance/SCORING_MODEL.md`'s
  distribution-without-marketing + Proven-evidence rules. A shared
  library (D1) scores *weakly* on distribution/revenue on its own
  (npm libraries monetize poorly). So the likely correct sequence is
  **not** "build D1 first as a product," but: **ship a
  revenue-bearing rule-pack product first (the one whose cited
  deep-eval wins), extracting the reusable `regdiff` core as a
  *byproduct* of building it** — then the second product reuses that
  core nearly free. D1-as-a-standalone-product is a later, optional
  open-core monetization play, not the foundation build.
- **Implication for the cap-unblocked session:** when deep-evaluating
  D2–D5 / rank-2, score each *as if the shared engine already exists*
  (because BidDiff's does) — that lifts every derivative's build-
  feasibility and strategic-fit sub-scores. Record the shared-core
  extraction as an explicit step in whichever derivative is approved
  first.

This is the kind of derivative/portfolio reasoning PART 3.1 asks for:
the second product should be cheaper than the first, by design.

**Thesis validated with running code (2026-05-30, PLAY loop):**
`products/biddiff/test/integration/engine-domain-agnostic.test.ts`
runs BidDiff's engine on a *non-federal* document (a generic software
license) and confirms the core generalizes — exactly the changed
clause surfaces as a MODIFY, unchanged paragraphs align, and the
federal rule-pack does NOT fire (NORMAL / OTHER). So the
"horizontal capability + separable rule-pack" claim is no longer just
reasoning; it's a passing test. That materially de-risks the
`regdiff`/D-family strategy: the engine reuse is real, not hoped-for.

#### New strategic insight (2026-05-30 evening, first-principles) — the "on-device trust" wedge is itself a distribution asset

The ranking so far treats BidDiff's **fully on-device** architecture (the
Compliance finding confirmed v1 makes no server calls beyond the
user-clicked SAM download) as a *privacy property*. Reframed, it is a
**distribution and sales wedge** that most of the D-family inherits for free
and that incumbents structurally cannot match:

- **The buyers in BidDiff's and the D-family's markets are
  compliance-sensitive by definition** — federal proposal/capture teams,
  GovTech/LegalTech/compliance engineers (D1/D2), regulated-industry vendors.
  For them "your documents never leave your machine" is not a nice-to-have;
  it is often what clears the *security review* that gates adoption. A
  server-side diff SaaS has to win a data-handling review; an on-device
  extension/library/plugin frequently skips it.
- **This inverts the usual "library/extension monetizes weakly" worry.** The
  on-device story is a *reason the artifact itself is the product* (no hosted
  tier needed to be trustworthy), which strengthens exactly the candidates
  the portfolio-sequencing note worried about (D1 `regdiff`, the rules
  loader). The moat isn't the hosting; it's the curated rule-pack + the
  zero-exfiltration guarantee.
- **Concrete ranking implication:** weight the **distribution-without-marketing**
  sub-score UP for any D-family candidate whose buyer faces a security review
  (D1, D2, the FAR/DFARS MCP server), because "runs locally / no data leaves"
  is a self-serve trust claim that shortens the sales cycle without a
  marketing spend — the exact property `SCORING_MODEL.md`'s hard filter
  rewards. It is a point AGAINST the Shopify/theme app (D4) and any hosted
  feed (rank-4), which are inherently server-side.
- **Non-obvious corollary (the Ambition-Critic "not a listicle" test):** the
  *strongest* first product may be the one whose buyer's security review is
  the **hardest** (so the on-device wedge is worth the most), not the one
  with the largest raw TAM. That argues for D2 `clauseguard` (compliance
  teams; GitHub Marketplace buy-intent) ranking at or above the higher-TAM
  but server-side D4 — sharpening, with a *reason*, the provisional order
  already in `RANKING.md`.

This is a cap-independent, first-principles refinement: it does not need
cited research to be actionable; it re-weights the existing candidates by a
property we can verify today (the on-device test passes). The cited deep-eval
should test it, not originate it. Logged for the cap-unblocked ranking pass.

### Standing candidate categories to populate via research

The seeded backlog above is a starting point. On every RESEARCH
cycle the factory adds new candidate ideas drawn from:

1. **Other JetBrains-marketplace adjacencies** — paid plugins
   for under-served languages or workflows. Same distribution
   and monetization advantages as rank 1.
2. **Other MCP-server niches** — domain-specific MCP servers
   for regulated industries, scientific data sources, tool
   registries.
3. **VS Code Marketplace paid extensions** — analogous story
   with different store mechanics.
4. **GitHub Marketplace apps** — the read-only carve-out in
   `governance/GUARDRAILS.md` #1 permits reading the GitHub
   surface; building paid GitHub apps that don't *use* Actions
   is permitted and lucrative.
5. **Other browser-extension stores** — Firefox, Edge. BidDiff
   is the first Chrome; the playbook generalizes.
6. **Shopify / Notion / Figma plugin marketplaces** — each a
   distribution surface with intent traffic and built-in
   billing; niche-pro audiences live here.
7. **Domain data / API products distributed via tool catalogs**
   — for example, a curated clause-text service surfaced
   through multiple agent frameworks (cf. the rank-2 idea).

The next session deep-evaluates the top candidate of each
category as research bandwidth allows.

---

## Working notes

- The factory **does not pick** the top idea and start building.
  The factory **deep-evaluates** the top idea and posts the
  proposal to `human/APPROVALS.md`. Only after approval (explicit
  or by auto-proceed window) does it build.
- The list is re-ranked every event per Section 3.4. The order
  here is the current best understanding; `brain/RANKING.md`
  carries the reasoning.
- The full sub-scores from `governance/SCORING_MODEL.md` are
  recorded with each idea after its deep evaluation, so the
  ranking is auditable.
- "Seeding placeholder" rows are explicit acknowledgements that
  the prior ranked list was richer than what landed here at
  bootstrap; the factory has a standing P2 task to reconstruct
  the missing ideas from prior conversation history and re-rank.

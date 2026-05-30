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
| 2 | **FAR/DFARS clause-currency MCP server** — MCP server that surfaces current FAR/DFARS clause text and changes to AI agents and IDEs. Distribution via the MCP registry; demand from any team building automation on federal procurement. | Prior research. | Plausible | not yet | not yet |
| 3 | **In-browser PDF text extractor (WASM)** — drop-in library for Chrome MV3 / web contexts: ligature normalization, hyphenation joining, layout-aware column detection, page rotation, encrypted-PDF detection. Distribution: npm + JSR. | `brain/WISHLIST.md` 2026-05-27 #1 (BidDiff friction). | Plausible | not yet | not yet |
| 4 | **SAM.gov amendment monitoring feed** — RSS / email / Slack / webhook notifications when a watched federal solicitation is amended, with the critical-change summary inline (re-uses BidDiff's engine + clause dataset). | `brain/WISHLIST.md` 2026-05-27 #2. | Plausible | not yet | not yet |
| 5 | **Critical-change rules curation DSL** — lets domain experts define critical-change rules in a structured DSL; exports runtime-loadable rule sets for any regulated-document-diff product (federal procurement, FDA filings, securities filings, building codes). | `brain/WISHLIST.md` 2026-05-27 #3. | Speculative | not yet | not yet |

### Wishlist-sourced candidates

The three rows immediately above (ranks 3-5) are
wishlist-sourced — each came from a friction moment captured
during BidDiff work and logged in `brain/WISHLIST.md`. The PLAY
loop will continue producing them.

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

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

Empty at bootstrap. Generated during research cycles by chaining
forward from validated ideas into under-served adjacent niches.

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

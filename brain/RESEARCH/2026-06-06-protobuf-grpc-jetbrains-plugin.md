# Deep Evaluation — D3: Protobuf/gRPC Breaking-Change Diff (JetBrains Plugin)

**Status:** DECISION-READY. Full cited evaluation.
**Date:** 2026-06-06
**Evaluator session:** 2026-06-06 research pass (web-cited)
**Prior scaffold:** `brain/RESEARCH/2026-05-30-ide-breaking-change-diff.md` (first-principles partial, 448/580 on 6 cap-independent factors)

---

## Scored Table

| Factor | Weight | Score (0–10) | Weighted Value | Evidence tier |
|---|---:|---:|---:|---|
| Revenue ceiling | 18 | 5 | 90 | Plausible |
| Probability of reaching ceiling | 14 | 4 | 56 | Plausible |
| Distribution quality | 14 | 7 | 98 | Proven |
| Maintenance fit | 10 | 9 | 90 | Proven |
| Build feasibility | 10 | 6 | 60 | Plausible |
| Self-serve monetization | 8 | 8 | 64 | Proven |
| Defensibility | 8 | 3 | 24 | Speculative |
| Evidence quality | 10 | 5 | 50 | Plausible |
| Strategic fit | 8 | 6 | 48 | Plausible |

**TOTAL SCORE: 580 / 1000**

**Threshold:** 600. This candidate scores **below** threshold by 20 points.

---

## Total Score and Threshold Comparison

| | Score |
|---|---|
| D3 this evaluation | **580 / 1000** |
| Threshold to advance | 600 / 1000 |
| Gap | −20 |
| D5 OpenAPI VS Code (prior eval) | 636 / 1000 |
| D3 vs D5 delta | −56 |

D3 does NOT clear the 600-point threshold. D5 (OpenAPI, VS Code) is the superior choice within this pattern by a meaningful margin.

---

## Evidence Tier: PLAUSIBLE

**Reasoning:** The pain is Proven — buf.build ($5.4M ARR in 2025, $93M total raised) validates that protobuf teams will pay for breaking-change tooling. However, the specific form factor (IDE-native inline annotation for JetBrains) has **no revenue comparables**. Buf's own JetBrains plugin (intellij-buf) is free, actively maintained by the incumbent, and already includes breaking-change detection access via `buf breaking`. The IDE-native niche does not have a documented paid product reaching meaningful revenue. The tier is therefore **Plausible**, not Proven.

---

## 1. Competitor Teardown

### JetBrains protobuf plugin landscape

Five distinct plugins exist on the JetBrains Marketplace for protobuf/gRPC:

**1. `intellij-buf` (Buf for Protocol Buffers, plugin ID 19147)**
- Vendor: bufbuild (Buf Technologies, the incumbent)
- Free, officially maintained
- Latest release: v0.7.7 (April 2, 2026) — 24 total releases, 426 commits
- GitHub stars: 24 (small but backed by a funded company)
- **Breaking change detection:** YES — includes `buf breaking` integration accessible via settings menu; v0.7.0 (Feb 18, 2025) added full LSP-based diagnostics including enhanced completion, hover, and diagnostics that surface lint + breaking checks
- Verdict: **The incumbent already has a JetBrains plugin with breaking-change detection.** It is free and company-backed. This is the most important competitive finding.

**2. `intellij-protobuf-plugin` by devkanro (Marketplace ID 16422)**
- Community-maintained, free, Apache-2.0
- GitHub: 94 stars, 16 forks
- Features: semantic analysis, cross-file navigation, real-time field validation, AIP compliance checks, Buf integration
- **Breaking change detection:** NO. Semantic validation only (field numbers, naming conventions). No version-diff capability.
- This is the most-downloaded community plugin for protobuf (exact count not exposed via search, but highest star count among community plugins)

**3. `Protobuf Support` by ksprojects (plugin ID 8277)**
- Older community plugin, effectively superseded
- GitHub repo shows no recent meaningful updates
- No breaking-change detection

**4. `Protocol Buffers` (plugin ID 14004) and `Google Protocol Buffers support` (plugin ID 4942)**
- Legacy/bundled support plugins
- Syntax highlighting only, no semantic intelligence

**5. `GenProtobuf` (plugin ID 11423)**
- Code generation utility, not a schema analysis tool

**Summary of IDE gap:** The IDE-native inline breaking-change annotation niche is partially occupied by the buf plugin (settings-accessible `buf breaking`), but not via always-on, as-you-type, version-diff inline squigglies. The buf plugin requires explicit invocation. The gap — persistent inline delta view against a prior committed version — is real but thin. The incumbent can close it in a single feature release.

### buf.build (primary incumbent)

- Revenue: **$5.4M ARR** (September 2025 per Latka) with 49 employees
- Funding: **$93.4M** across 4 rounds (seed through Series B, last round closed ~2021)
- Pricing tiers: Community (free), Teams (per-type pricing), Pro ($1,000/mo base + $5/type/month above 200 types), Enterprise (custom)
- Breaking-change detection: 46 rules in strictest mode (vs. protolock's 8)
- CI/CD integration: `buf-breaking-action` for GitHub Actions
- JetBrains plugin: free, actively maintained, latest release April 2026
- **Key risk signal:** Buf is well-funded, has a JetBrains plugin, and has already implemented breaking-change detection in the IDE context. The moat the proposed product would occupy is already partially claimed by an entity with $93M in funding and existing distribution.

### protolock

- GitHub: 633 stars, 37 forks
- Last release: December 2023 (Add support for checking field moves into/out of oneof)
- No commercial offering
- 21 open issues, effectively in maintenance mode
- Buf has a formal migration guide away from protolock; buf is winning
- Not a meaningful market participant for this evaluation

### Salesforce proto-backwards-compat-maven-plugin

- Maven plugin for Java build pipelines; niche; not IDE-native
- No commercial dimension

### Key gap finding

No paid JetBrains plugin exists for protobuf breaking-change detection. The closest thing (intellij-buf) is free and maintained by the $93M-funded incumbent. **The IDE-native niche for inline as-you-type version-diff annotation is unoccupied as a paid product, but it is occupied as a free product by the category leader.**

---

## 2. Revenue Model

### Comparable plugin pricing on JetBrains Marketplace

JetBrains Marketplace handles billing natively (the 2025 update added perpetual licenses alongside annual/monthly subscriptions). JetBrains takes a **15% commission** from all sales; the developer receives 85%. Payment is fully automated — JetBrains issues self-billing invoices and pays out when the developer reaches $200 minimum.

The marketplace supports: annual subscriptions with fallback licenses, monthly subscriptions, freemium (free core + paid features), and as of January 2025, perpetual licenses.

**BashSupport Pro** (a paid developer-tool plugin) provides the best public data point: 96% of its sales are annual subscriptions; 73% are individual purchases. Specific MRR is not publicly disclosed but the pricing page exists. This confirms the pattern works for developer tools.

**Rainbow Brackets** (plugin ID 10080): paid version exists alongside a free lite version; no public revenue figures.

**Realistic pricing estimate for a protobuf breaking-change plugin:**
- Individual: $5–$12/month (annual = $60–$144/year per seat)
- Team: $8–$15/month per seat
- Comparable: BashSupport Pro current pricing (updated June 2024 — first price increase in 4 years, confirming the plugin existed long enough to justify a price update)

**Revenue ceiling analysis:**

- JetBrains has 11.4M recurring active users (2023 reported figure)
- gRPC/protobuf is a backend/microservices-specific tool; estimate 5–8% of JetBrains users work with protobuf regularly (the 2022 JetBrains microservices survey found gRPC growing but still a minority of the total user base; a 2024 Buf survey covered 5,000 backend engineers specifically)
- TAM within JetBrains: ~570K–900K developers
- Realistic conversion at $10/user/month with 0.1% conversion: **$57K–$90K/month**
- Realistic conversion at 0.05% (more conservative): **$28K–$45K/month**

However, the ceiling is suppressed by two structural factors:
1. The buf plugin is free and does this partially — free alternative anchors willingness-to-pay to near-zero for the basic case
2. Protobuf teams are more likely to be enterprise accounts managed at the org level through buf BSR, meaning the individual IDE plugin sale is downstream of an org decision already captured by buf

Adjusted realistic ceiling: **$8K–$20K/month MRR at maturity**, making a $20K/month target achievable only if the product captures a meaningful share of teams NOT already on buf's paid tier. Score: **5/10** (ceiling reachable but requires winning a niche the incumbent nearly surrounds).

---

## 3. Distribution Analysis

### JetBrains Marketplace mechanics

- Marketplace delivers organic intent-based discovery (developers search "protobuf" or browse language plugins)
- Native billing: fully self-serve, no external Stripe setup required by the developer
- JetBrains handles all payment processing, invoicing, and license key delivery
- Perpetual licenses added January 2025 — broadens appeal to buyers who prefer one-time payment
- Plugin visibility is governed by download count + rating; new entrants face discoverability cold-start

### Protobuf search intent on JetBrains Marketplace

Five to six protobuf plugins compete for search real estate. The buf plugin (backed by the incumbent) and devkanro's plugin have the most momentum. A new paid plugin would start at the bottom of search results and need organic installs to surface.

**Critical distribution problem:** The strongest discoverability position is for protobuf editing (devkanro is winning that) and buf integration (buf themselves own that). A "breaking-change-diff" specific search query represents a very narrow long-tail that may not have high search volume in the JetBrains Marketplace.

### Scale of the addressable marketplace

JetBrains Marketplace reached 10,000 plugins by August 2025. IntelliJ IDEA usage among Java developers: 84% in 2025 (per Perforce JRebel survey). The gRPC/protobuf subset of JetBrains users is material but narrower than OpenAPI/REST users.

VS Code has a significantly larger total developer population than JetBrains — VS Code commands approximately 74% IDE usage overall vs. JetBrains at ~27%. This directly suppresses D3's audience ceiling relative to D5.

**Distribution score: 7/10** — marketplace exists and delivers intent-based traffic; native billing is a genuine advantage; but the audience is 2–3x smaller than VS Code, search competition is crowded, and the incumbent holds a structural discoverability advantage.

---

## 4. Build-Effort Estimate

### Language/platform constraint

JetBrains plugin development requires **Kotlin (2.x required for IntelliJ 2025.1+)** or Java 21. This is a binding constraint — the platform is not TypeScript/JavaScript. Claude Code is highly capable in Kotlin but the JetBrains IntelliJ Platform SDK has significant complexity (PSI trees, FileViewProvider, annotation layers, background inspection framework).

### Protobuf parser feasibility

Protobuf's grammar is well-specified and public (proto2/proto3/edition 2024). Two open-source IntelliJ protobuf plugins provide reference implementations of PSI-based parsing (devkanro's under Apache-2.0, jvolkman's intellij-protobuf-editor). The rule-pack for breaking changes is well-documented by buf (46 rules across FILE, PACKAGE, WIRE_JSON, WIRE categories).

**Parser approach options:**
1. Build a custom PSI grammar (high effort, high fidelity)
2. Wrap the buf CLI as a language server and diff its output (lower effort, requires buf CLI installed on user's machine — a friction point)
3. Depend on devkanro's plugin PSI and add inspections on top (fastest path, but creates a dependency risk and plugin compatibility requirements)

Option 2 is the pragmatic path and is what intellij-buf already does (they use `buf` as an LSP backend). This creates a deep strategic problem: to differentiate from the free buf plugin, the proposed product would need to implement its own breaking-change logic (not depend on buf CLI), which means building the full 46-rule logic in Kotlin. That is a meaningful build scope.

### Estimated build phases

- **Phase 1:** Protobuf PSI parser or integration with devkanro's plugin — 3–5 build cycles
- **Phase 2:** Version-snapshot system (track "committed version" vs. current buffer) — 2–3 build cycles
- **Phase 3:** Breaking-change rule implementation (minimum: wire-breaking rules, 15–20 rules) — 3–5 build cycles
- **Phase 4:** Inline annotation layer (IntelliJ inspection + gutter markers) — 1–2 build cycles
- **Phase 5:** Licensing integration (JetBrains native billing) — 1 build cycle
- **Phase 6:** Marketplace submission + review — 1–2 cycles (JetBrains review is typically 1 week)

**Total: 11–18 build cycles.** This is materially more build effort than the scaffold's "engine reuse" framing implied. The BidDiff engine's align/diff/classify logic does transfer for the rule classification layer, but the PSI + Kotlin + IntelliJ Platform SDK work is non-trivial and agent-unfamiliar territory relative to Node/TypeScript.

**Build feasibility score: 6/10** — well-documented, public specs, open-source references exist; but Kotlin/JetBrains SDK is significantly more complex than VS Code extension development, and the scope required to differentiate from the free buf plugin is large.

---

## 5. Risk Register

### R1: Incumbent closes the gap (HIGH probability, HIGH impact)
Buf is a $93M-funded company with an active JetBrains plugin already providing breaking-change detection access. The specific gap (always-on inline diff annotation) could be closed in one sprint by a funded team. Buf's LSP backend (added v0.7.0, Feb 2025) means the technical path to inline squigglies is already in place — they just need to hook it up. **This is the single largest risk and makes defensibility very low.**

### R2: "CLI is good enough" — adoption ceiling (MEDIUM probability, HIGH impact)
The protobuf/gRPC community has strong CLI-first culture. buf is already integrated in CI/CD pipelines. Teams that have already deployed buf breaking checks in their CI pipeline may not pay for an IDE layer they don't need. The value add requires the developer to care about the feedback loop at edit-time vs. at PR review time.

### R3: Free alternative anchors pricing to zero (HIGH probability, MEDIUM impact)
intellij-buf is free. Users who search "protobuf breaking change JetBrains" will find the free buf plugin first. Charging for a feature the category leader gives away free requires strong differentiation (better UX, richer explanations, deeper annotation). Achievable, but each user who tries buf first reduces conversion.

### R4: Narrow audience limits ceiling (CERTAIN, MEDIUM impact)
gRPC/protobuf is backend/microservices-specific. REST/OpenAPI is the much larger adjacent market. JetBrains itself is narrower than VS Code. The intersection (JetBrains + protobuf + willing to pay for IDE plugin) is a small absolute number. Even at 0.1% conversion, the ceiling requires a meaningful portion of the protobuf-on-JetBrains population to actually find and pay for the product.

### R5: Platform risk — JetBrains Marketplace policy (LOW probability, MEDIUM impact)
JetBrains controls the marketplace; commission rates can change with 30-day notice (currently capped at 25%); JetBrains could ship its own breaking-change tooling bundled in the IDE. Low probability but non-zero.

### R6: Build complexity in Kotlin/PSI (MEDIUM probability, MEDIUM impact)
The IntelliJ Platform SDK has a reputation for instability across IDE versions (the API changes list for 2025 alone shows significant incompatible changes). Maintaining compatibility across IntelliJ IDEA, GoLand, PyCharm, WebStorm (all target gRPC users) requires testing across multiple products. This is ongoing maintenance burden.

### R7: AI commoditization (LOW-MEDIUM probability, MEDIUM impact)
GitHub Copilot and JetBrains AI Assistant can already explain protobuf breaking changes when prompted. As AI IDE assistants mature, a dedicated breaking-change classifier may lose ground to an "ask the model" workflow. Timeline for this to matter: 18–36 months, which is within the product's competitive window.

---

## 6. Why This Might Fail (Mandatory Adversarial Section)

**The incumbent already ships the product for free.** This is the core failure mode and it is not theoretical — buf's JetBrains plugin (intellij-buf) includes breaking-change detection, is free, is backed by $93M in funding, and was updated 5 days before this evaluation was run (April 2, 2026). The niche this product would occupy is partially filled. A paid product competing with a free product from the category-defining company requires the paid product to be dramatically better on UX, depth, or reliability — not marginally better.

**The wedge is thinner than it looks.** "IDE-native immediacy" is the thesis. But buf's LSP-based plugin already provides real-time diagnostics (added February 2025). The remaining gap — persistent version-diff inline view rather than on-demand checks — is a UX refinement, not a capability gap. That is a weak wedge to charge for.

**Protobuf audience is narrower than OpenAPI by a factor of 3–5x.** REST APIs using OpenAPI spec are universal; gRPC is a backend/infra choice made by a minority of teams. The D3 candidate has structurally smaller revenue potential than D5 (VS Code + OpenAPI) even before considering competitive dynamics.

**The unit economics are suspect at the conversion rates realistic for a new plugin.** To reach $20K MRR at $10/month, the product needs 2,000 paying users. If the addressable pool is ~800,000 JetBrains users who use protobuf, that is 0.25% conversion — feasible in theory but historically above the median for paid developer tools, especially ones competing against a free alternative.

**The JetBrains Marketplace is a smaller market than VS Code.** VS Code has 35M+ installs for popular extensions; JetBrains protobuf plugins have install counts in the thousands to low tens of thousands. Revenue ceiling is directly constrained by market size.

---

## 7. Hard Filter Pass/Fail Analysis

| Filter | Pass/Fail | Evidence |
|---|---|---|
| Distribution-without-marketing | **PASS** | JetBrains Marketplace delivers intent-based organic traffic; native search |
| Self-serve monetization | **PASS** | JetBrains handles all billing, licensing, and payouts natively; 15% commission; full self-serve |
| Build feasibility for autonomous agent | **CONDITIONAL PASS** | Kotlin/PSI well-documented; open-source reference plugins available; but scope is larger than initially framed and Kotlin/IntelliJ SDK is more complex than VS Code extension development |
| Zero-opex / near-zero operating cost | **PASS** | No server required; plugin runs entirely on-device; JetBrains handles license enforcement |
| Buildable inside spend cap | **CONDITIONAL PASS** | 11–18 build cycles is on the high end; feasible but resource-intensive |

**No hard filter fails outright.** However, the Build feasibility filter is conditional: the build is larger and riskier than the scaffold implied.

---

## 8. Factor-by-Factor Evidence Detail

### Revenue ceiling (Score: 5/10)
Ceiling of $8K–$20K/month MRR is realistic but requires strong execution. The suppression factors are: free incumbent, narrow audience intersection (JetBrains + protobuf + willing to pay), and enterprise teams already captured by buf's BSR subscription. The $20K ceiling is achievable but not the likely central case.

Sources: buf pricing page (Teams tier, Pro tier at $1,000/mo base); BashSupport Pro pricing update (June 2024); JetBrains Marketplace revenue sharing (15% commission). buf revenue: $5.4M ARR per Latka (September 2025).

### Probability of ceiling (Score: 4/10)
The wedge (IDE-native inline diff) is real but thin. The incumbent already partially covers this space for free. Historical analogues of paid plugins beating free incumbents exist but require 2–3x better UX. The probability of reaching $20K MRR against intellij-buf as a free competitor is low. Score: 4/10.

### Distribution quality (Score: 7/10)
JetBrains Marketplace has native intent-driven discovery and native billing. Protobuf-related searches surface real buyer intent. However: smaller audience than VS Code (27% vs. 74% IDE market share overall), incumbent plugin has distribution advantage (existing install base, buf.build brand), cold-start problem for a new plugin. Score: 7/10 (strong mechanics, structural audience disadvantage).

Sources: JetBrains Marketplace documentation; IntelliJ IDEA usage 84% among Java developers (Perforce JRebel 2025); JetBrains 11.4M recurring active users (2023); JetBrains marketplace hit 10,000 plugins (August 2025).

### Maintenance fit (Score: 9/10)
Fully on-device plugin; JetBrains license enforcement handles all licensing ops; no server to maintain. Only maintenance is IDE version compatibility (IntelliJ Platform SDK changes) — this is the same cadence as any JetBrains plugin developer. Score: 9/10.

### Build feasibility (Score: 6/10)
Protobuf grammar is public and well-documented. Two open-source reference implementations (devkanro under Apache-2.0, jvolkman's intellij-protobuf-editor under Apache-2.0) provide PSI implementation references. Breaking-change rules are fully documented by buf (46 rules). However: Kotlin 2.x required, IntelliJ Platform SDK is complex, cross-product compatibility (IDEA/GoLand/PyCharm/WebStorm) adds test scope. Differentiating from the free buf plugin requires building the full rule set natively (not wrapping buf CLI). Score: 6/10.

Sources: JetBrains IntelliJ Platform SDK (using-kotlin.html — Kotlin 2.x required for 2025.1+); buf breaking rules documentation; devkanro/intellij-protobuf-plugin (94 stars, Apache-2.0); bufbuild/intellij-buf (24 stars, free).

### Self-serve monetization (Score: 8/10)
JetBrains Marketplace handles everything: purchase flow, license key generation, renewal, perpetual license option (added January 2025). Developer receives 85% of revenue. Self-billing invoices generated automatically. No Stripe setup, no external license server. Score: 8/10 (slight deduction vs. 10/10: plugin review process adds a gatekeeping step; commission is 15%).

Sources: JetBrains Marketplace revenue sharing documentation; JetBrains Marketplace billing & licensing documentation; perpetual licenses announcement (January 2025).

### Defensibility (Score: 3/10)
The fundamental problem: the moat is "a paid version of something the incumbent gives away free." That is not a moat — it is an uphill competitive position. The only defensibility paths are: (1) dramatically better UX + explanation quality (copyable), (2) deeper rule coverage (buf already has 46 rules, copyable), (3) integration with non-buf workflows (weak differentiation). No data moat. No network effect. Score: 3/10.

### Evidence quality (Score: 5/10)
Demand for protobuf breaking-change tooling is Proven (buf's $5.4M ARR proves it). Demand for a paid JetBrains IDE plugin specifically for this use case is Plausible at best — the free buf plugin exists and covers the space. No comparable paid plugin has documented revenue. Evidence tier: Plausible. Score: 5/10.

Sources: buf.build $5.4M ARR (Latka, September 2025); intellij-buf plugin activity (24 releases, last updated April 2026, GitHub: bufbuild/intellij-buf); protolock (633 stars, no commercial dimension, last major release December 2023).

### Strategic fit (Score: 6/10)
Engine reuse: the align/diff/classify engine from BidDiff transfers (rule pack differs, parser differs). The marketplace playbook (JetBrains Marketplace vs. prior patterns) is new learning. The protobuf breaking-change rule library compounds into the proposed OpenAPI/D5 plugin (both need a "breaking change classification" concept). Score: 6/10 — partial compounding; not the strong portfolio flywheel of the regulatory family.

---

## 9. Verdict: CONDITIONAL DEFER

**Score: 580 / 1000 — below the 600-point threshold.**

**Primary reason:** The incumbent (buf) already ships a free JetBrains plugin with breaking-change detection access, and that plugin was updated 65 days before this evaluation. The paid-vs-free dynamic fundamentally caps defensibility and probability of reaching the revenue ceiling.

**Secondary reason:** Protobuf on JetBrains is a narrower audience than OpenAPI on VS Code (D5). D5 scored 636/1000 and is the superior execution of the same pattern.

**CONDITIONAL DEFER means:**
- Do NOT build D3 before D5 — D5 is strictly better on this same pattern.
- Revisit D3 ONLY IF: (a) D5 ships and succeeds, AND (b) buf's JetBrains plugin stagnates or the company pivots away from free IDE tooling.
- Log to IDEA_BACKLOG.md at current score; do not advance to approved-for-build.

**If conditions changed that would elevate D3:**
1. buf abandons or paywalls intellij-buf — removes the free incumbent, jumps defensibility to 6/10
2. D5 generates revenue signals that validate the IDE-native breaking-change pattern — raises probability/evidence scores
3. A community survey shows gRPC/protobuf teams actively frustrated by buf's IDE integration — validates the remaining wedge

**The decision is not "reject forever" — it is "D5 first, D3 conditionally after."**

---

## Sources

- [Buf for Protocol Buffers (intellij-buf) — JetBrains Marketplace](https://plugins.jetbrains.com/plugin/19147-buf-for-protocol-buffers)
- [bufbuild/intellij-buf — GitHub](https://github.com/bufbuild/intellij-buf)
- [Detecting breaking changes — Buf Docs](https://buf.build/docs/breaking/)
- [Buf pricing page](https://buf.build/pricing)
- [Buf plans/pricing blog post](https://buf.build/blog/plans-pricing-updates)
- [How Buf hit $5.4M revenue — Latka](https://getlatka.com/companies/buf.build)
- [Toronto startup Buf raises $100M — NY Tech Media](https://nytech.media/toronto-startup-buf-technologies-raises-more-than-100-million-with-18-employees-no-revenue-but-big-plans-to-change-how-software-is-built/)
- [Buf Crunchbase profile](https://www.crunchbase.com/organization/buf-technologies)
- [protolock — GitHub](https://github.com/nilslice/protolock)
- [devkanro/intellij-protobuf-plugin — GitHub](https://github.com/devkanro/intellij-protobuf-plugin)
- [Protobuf plugin (devkanro) — JetBrains Marketplace](https://plugins.jetbrains.com/plugin/16422-protobuf)
- [JetBrains Marketplace plugin monetization docs](https://plugins.jetbrains.com/docs/marketplace/plugin-monetization.html)
- [JetBrains Marketplace revenue sharing](https://plugins.jetbrains.com/docs/marketplace/revenue-sharing-and-fees.html)
- [Introducing Perpetual Licenses on JetBrains Marketplace (Jan 2025)](https://blog.jetbrains.com/platform/2025/01/introducing-perpetual-licenses-on-jetbrains-marketplace/)
- [BashSupport Pro pricing update — June 2024](https://www.bashsupport.com/news/2024-pricing-update/)
- [Configuring Kotlin Support — IntelliJ Platform SDK (Kotlin 2.x requirement)](https://plugins.jetbrains.com/docs/intellij/using-kotlin.html)
- [IntelliJ IDEA usage 84% — Perforce JRebel](https://www.jrebel.com/blog/best-java-ide)
- [JetBrains Annual Highlights 2024](https://www.jetbrains.com/lp/annualreport-2024/)
- [JetBrains Marketplace reaches 10,000 plugins](https://platform.jetbrains.com/t/10-000-plugins-on-the-jetbrains-marketplace/2434)
- [Migrate from Protolock — Buf Docs](https://buf.build/docs/migration-guides/migrate-from-protolock/)
- [buf-breaking-action — GitHub](https://github.com/bufbuild/buf-breaking-action)
- [gRPC vs REST 2026 — tech-insider.org](https://tech-insider.org/grpc-vs-rest-2026/)
- [JetBrains State of Developer Ecosystem 2024](https://www.jetbrains.com/lp/devecosystem-2024/)
- [salesforce/proto-backwards-compat-maven-plugin — GitHub](https://github.com/salesforce/proto-backwards-compat-maven-plugin)

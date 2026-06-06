# Deep evaluation — JetBrains / Salesforce Apex plugin

**Status:** **COMPLETE** — Full deep evaluation with cited research.
Research performed 2026-06-06. All scaffold sections filled.
The completed proposal is ready for posting to `human/APPROVALS.md`.

**Idea:** A paid JetBrains IDE plugin targeting Salesforce Apex
developers that addresses a specific, sharp pain point NOT covered by
Illuminated Cloud 2. Feature recommendation: **Governor-Limit Static
Analyzer** — inline, real-time Apex analysis that flags SOQL-in-loops,
DML-in-loops, cross-trigger bulkification failures, and limit-proximity
patterns with a severity heatmap in the gutter.

**Source:** Prior research; ranked #1 in `brain/RANKING.md`.

**Revised evidence tier:** **Plausible** (downgraded from Provisional
"Proven" — see Section 7 for full reasoning).

---

## 1. Competitor Teardown

### 1.1 Illuminated Cloud 2 (dominant Apex IntelliJ plugin)

**Product URL:** https://plugins.jetbrains.com/plugin/10253-illuminated-cloud-2

**Publisher:** Rose Silver Software LLC. Scott Wells is president and
sole founder (Crunchbase: https://www.crunchbase.com/person/scott-wells-c4f3).
This is a **single-developer operation** — a material bus-factor risk.

**Pricing (confirmed):**
- Personal license: **$90 USD/year**
- Commercial license: **$125 USD/year** (volume discounts available)
- Legacy IC 1.x upgraders received a $25 discount in year one ($65)
- Reseller copies available via Insight.com (ILLCLOUD2CSL-I1IC) at
  these same prices
- Source: Illuminated Cloud 2.0 Release Details (groups.google.com/a/illuminatedcloud.com/g/announcements/c/6c77Fur3JfA)
  and Insight.com product listing

**Install / download count:** JetBrains Marketplace blocks direct scraping
(HTTP 403). No publicly indexed install figure found in search results.
Proxy estimates: the Salesforce Ben 2025 Developer Survey (n ≈ 350)
reports **7.1% of Salesforce developers use Illuminated Cloud**. Against
a global base of ~75,000–80,000 active certified Apex developers (see
Section 3), that implies roughly **5,300–5,700 active users** — call it
~5,000 conservatively. Not all are paying; some use the free trial or
pre-2.0 perpetual licenses. Paying-subscriber estimate: 2,000–4,000.

**User reviews — pain-point themes (sourced from JetBrains Marketplace
review page and G2):**
- Consistently praised as "the best IDE for Salesforce development" and
  "worth every penny." Support from Scott Wells (1:1 email exchange) is
  highlighted positively.
- Pain points:
  1. Authentication friction — users want simpler org login without
     resetting security tokens.
  2. Metadata retrieval failures — "nothing comes over" on some orgs,
     source folder stays empty.
  3. Solo-developer maintenance risk — the tool's update cadence
     depends entirely on one person keeping pace with both Salesforce
     API changes and IntelliJ Platform API changes (implied by review
     comments about waiting for compatibility updates).
  4. No native ApexGuru / Code Analyzer integration (Salesforce's
     performance-analysis feature ships only in VS Code; IC2 users have
     no equivalent — see Section 1.2 below).

**Feature gaps confirmed by research:**
- IC2 *does* include: code completion, refactoring, SOQL query tool,
  anonymous Apex, unit test execution, code coverage (line coloring via
  IDE Coverage plugin), log viewer, offline debugger, Salesforce DX.
- IC2 does *not* include:
  - Deep governor-limit static analysis with **real-time inline gutter
    warnings** tied to specific limit categories (SOQL, DML, CPU,
    heap). The Coverage plugin integration shows coverage percentage but
    no limit-proximity heatmap.
  - Multi-org diff / sandbox comparison (separate external tools handle
    this: sforgcompare, Metazoa, Blue Canvas — none IDE-integrated).
  - ApexGuru-class AI-assisted governor limit fixing (VS Code only as
    of 2026-04).
  - The PMD IntelliJ plugin (plugin 1137) exists but **is not maintained
    by the PMD team** and has not been updated for Salesforce Apex
    governor-limit rule parity with PMD 7.x.

Sources: JetBrains Marketplace IC2 reviews; JetBrains IDEA Blog on IC
(blog.jetbrains.com/idea/2018/02/salesforce-development-plugins-part-1-illuminated-cloud/);
GitHub issue on PMD-Intellij (github.com/amitdev/PMD-Intellij/issues/33);
Salesforce Developer Blog on ApexGuru MCP integration
(developer.salesforce.com/blogs/2026/04/performance-first-apex-development-with-apexguru-in-salesforce-dx-mcp-server).

---

### 1.2 Salesforce Extension Pack for VS Code

**URL:** marketplace.visualstudio.com/items?itemName=salesforce.salesforcedx-vscode

**What it covers:**
- Full Apex language server (LSP-based): completion, go-to-definition,
  hover, diagnostics
- Apex test runner with code coverage overlay (green/red line coloring;
  note: disabled by default for performance)
- SOQL builder (visual)
- Salesforce CLI integration (deploy, retrieve, push, pull)
- Apex Interactive Debugger (paid add-on via Salesforce subscription)
- Code Analyzer VS Code Extension: runs PMD, ESLint, RetireJS, Graph
  Engine, and **ApexGuru** with inline violation underlining and the
  Problems tab
- ApexGuru (as of 2025): AI-assisted governor limit detection — SOQL in
  loops, CPU limit risks, heap issues. As of 2026-04, also available
  via Salesforce DX MCP Server (agentic mode, compatible with Claude
  Code, Cursor, Cline)

**What it specifically does NOT cover on JetBrains:**
- The entire VS Code extension pack is VS Code-only. There is NO
  official Salesforce JetBrains plugin.
- ApexGuru inline detection — VS Code only. JetBrains users have no
  equivalent native integration.
- Code Analyzer VS Code Extension — VS Code only.
- Apex Interactive Debugger — VS Code only (IC2 has its own offline
  debugger, but it is separate).

Source: Salesforce Extensions overview (developer.salesforce.com/docs/platform/sfvscode-extensions/overview);
ApexGuru VS Code integration (developer.salesforce.com/docs/platform/salesforce-code-analyzer/guide/analyze-vscode.html).

---

### 1.3 Other paid / significant Apex tooling

**JetForcer** (plugins.jetbrains.com/plugin/9238-jetforcer--the-smartest-force-com-ide/pricing):
- Direct IC2 competitor on JetBrains
- Features: code completion, refactoring for Apex/SOQL/VF/LWC, SOQL
  editor, Code Coverage Inspector, test runner
- Pricing: JetBrains standard subscription model (freemium 30-day
  trial; yearly with 20% discount year 2, 40% year 3+; monthly with
  perpetual fallback)
- **Specific prices not found in search results** (marketplace page 403)
- JetBrains blog covered it in 2018; activity level unclear in 2025-26

**The Welkin Suite** (welkinsuite.com):
- Standalone Salesforce IDE (not a JetBrains plugin; built on VS shell)
- Professional: $15/month or $150/year per user
- Enterprise: $25/month or $250/year per user
- Includes Apex test runner, retrospective debugger, code completion
- Source: Welkin Suite pricing page (welkinsuite.com/the-welkin-suites-pricing-plans)

**Salesforce Inspector Reloaded** (tprouvot.github.io/Salesforce-Inspector-reloaded/):
- **Completely free and open-source** (Chrome/Firefox extension)
- NOT an IDE plugin; it is a browser overlay on the Salesforce UI
- Features: SOQL query runner, data export/import, REST API explorer,
  metadata inspector, Flow scanner, debug log viewer
- No governor-limit IDE analysis; no relationship to JetBrains
- Source: GitHub repo (github.com/tprouvot/Salesforce-Inspector-reloaded);
  Salesforce Developers Blog (developer.salesforce.com/blogs/2024/07/improve-your-productivity-with-salesforce-inspector-reloaded)

**Qualimetry Apex Analyzer** (plugins.jetbrains.com/plugin/30781-qualimetry-apex-analyzer):
- New entrant: IntelliJ plugin for static analysis of .cls and .trigger
  files; powered by the same engine as their VS Code extension
- Free or paid tier unclear; JetBrains Marketplace page inaccessible
- Not widely covered in community discussion; very low profile as of
  research date

**CodeScan** (by AutoRABIT):
- Enterprise-grade Salesforce static analysis (700+ rules)
- IntelliJ plugin integration listed in product documentation
- Pricing: contact-based, lines-of-code model, enterprise-focused
- NOT a JetBrains Marketplace consumer plugin; targets enterprise DevOps

Source: AutoRABIT CodeScan overview (autorabit.com/products/codescan-static-code-analysis/)

---

### 1.4 Revenue comps — paid IntelliJ/JetBrains plugins

**Revenue share confirmed:** JetBrains takes **15% commission** on each
plugin sale (deducted from list price before transfer to developer);
the commission shall **never exceed 25%** and the developer fee shall
**never be less than 75%** of list price. For high-revenue plugins,
JetBrains may negotiate custom terms.
Source: JetBrains YouTrack KB article (youtrack.jetbrains.com/articles/SUPPORT-A-1776/Revenue-sharing-and-JetBrains-fee-for-plugins-sold-via-Marketplace)
and the Developer Agreement (jetbrains.com/legal/docs/plugins_site/developer-agreement/1.1/1.1.pdf).

**Comparable paid plugins:**

| Plugin | Category | Approx. price/yr (individual) | Notes |
|---|---|---|---|
| BashSupport Pro | Shell scripting language support | ~$29/yr (pre-2024); repriced June 2024 | 96% of sales are annual; 37% US, 14% DE; 73% individual buyers. No public revenue. Source: bashsupport.com/news/bashsupport-future/ |
| Illuminated Cloud 2 | Salesforce/Apex | $90–$125/yr | See Section 1.1 |
| JetForcer | Salesforce/Apex | Unknown (JB subscription model) | Direct competitor |
| The Welkin Suite | Salesforce standalone IDE | $150–$250/yr | Not a JetBrains plugin |
| Scala plugin | Scala language | Free (bundled by JetBrains) | 82% of Scala devs use IntelliJ; Scala plugin itself is free |

**Key finding on revenue comps:** No paid JetBrains plugin in an
adjacent niche has publicly disclosed its revenue or active subscriber
count. The Scala and Kotlin language plugins are free. BashSupport Pro
is the clearest structural analog (niche language, one developer, paid)
but no dollar figures are public. Evidence tier cannot be "Proven"
because no publicly documented revenue ceiling figure exists for a
directly comparable plugin.

---

## 2. Realistic Revenue Model

### 2.1 Total addressable market

- Global certified Salesforce developers: ~75,000–80,000 (44% of
  170,000+ certified professionals; source: syncgtm.com/blog/how-many-sales-force-developers-are-there,
  salesforceben.com)
- Using JetBrains IDEs for Apex: **7.1%** per the Salesforce Ben 2025
  Developer Survey (n=350+); that is ~5,300–5,700 developers
  (source: salesforceben.com/4-key-insights-from-our-2025-salesforce-developer-survey-results/)
- Note: India (42% of global Salesforce developers) is price-sensitive;
  North America (30%) is not. The commercial-license buyer skews toward
  the 30% North America + 28% rest-of-world professional segment.

### 2.2 Serviceable market for a COMPLEMENTARY plugin (not a replacement)

- IC2 is the incumbent and required for Apex development on JetBrains.
  A complementary plugin targeting IC2 users captures a subset.
- If IC2 has ~2,000–4,000 paying users, a complementary plugin might
  convert 10–25% = 200–1,000 paying users at launch.
- At $49/year (positioned below IC2's $90 personal): 200–1,000 × $49 = **$9,800–$49,000/yr** gross revenue.
- JetBrains takes 15%; net to developer: **$8,330–$41,650/yr**.
- Ceiling scenario (aggressive): 1,500 subscribers at $79/year = $118,500 gross / $100,725 net.
- Floor scenario (conservative): 300 subscribers at $49/year = $14,700 gross / $12,495 net.
- **Honest assessment: the ceiling is ~$100K ARR net. The floor is ~$12K ARR net. This is a
  lifestyle-business ceiling, not a venture ceiling.** For an autonomous factory
  building self-serve products, that is still meaningful but not large.

### 2.3 Pricing strategy

- **Freemium**: free tier detects 5 limit categories with no fix
  suggestions; paid tier adds full rule set, fix-it actions, severity
  heatmap, per-class limit dashboard.
- Annual subscription: $49/yr personal, $79/yr commercial (positioned
  meaningfully below IC2 to encourage adoption as a complement).
- 30-day free trial (JetBrains Marketplace standard).
- JetBrains handles all billing, trials, renewals, and refunds.

### 2.4 Install-to-purchase conversion benchmarks

No public JetBrains Marketplace conversion rate data found in any
indexed source. JetBrains Marketplace documentation (plugins.jetbrains.com/docs/marketplace/plugin-stats.html)
describes analytics available to plugin developers but does not publish
aggregate marketplace conversion rates. Community discussion on
plugin-dev.com is paywalled/403.

**Working assumption** (must be flagged as speculative): JetBrains
Marketplace conversion for a niche paid plugin is likely 3–8%, similar
to VS Code Marketplace freemium conversion ranges cited anecdotally in
developer blogs. At 3% conversion on 5,000 IC2 users discovering the
plugin: 150 subscribers. At 8%: 400 subscribers. This range (~150–400
paying users) is consistent with the conservative floor scenario above.

---

## 3. Distribution Analysis

### 3.1 JetBrains Marketplace mechanics

- **Revenue share:** Developer keeps 85% of list price (JetBrains
  15%); floor at 75% developer share. Cap on JetBrains fee: 25%.
  Source confirmed (see Section 1.4).
- **Listing process:** Plugin vendor signs Developer Agreement, submits
  plugin via JetBrains Marketplace plugin upload form, sets pricing via
  the Pricing tab, and approves the End User License Agreement template.
  JetBrains reviews the plugin (typically a few business days).
  Paid plugins require vendor approval and the plugin must meet
  functionality standards. Full docs: plugins.jetbrains.com/docs/marketplace/paid-plugins.html
- **Ranking signals:** JetBrains Marketplace ranks by downloads,
  rating, update recency, and keyword relevance in the plugin name and
  description. New paid plugins with high initial ratings surface
  prominently.
- **Payment to vendor:** Payout threshold is $200/€200 or December 31
  annually. Payouts are quarterly.
- **Adjacent marketplace opportunities:**
  - The Salesforce Code Analyzer CLI (command-line) can run PMD rules
    from any IDE including IntelliJ; a future CLI companion could reach
    VS Code users too.
  - No obvious path to list on VS Code Marketplace as the same
    deliverable (different extension API).

### 3.2 Apex developer audience on JetBrains specifically

- Global Salesforce/Apex developers: 75,000–80,000 certified (see
  Section 3 above); broader uncertified developer population could be
  1.5–2× larger.
- JetBrains share: 7.1% of survey respondents (Salesforce Ben 2025)
- **Illuminated Cloud is the only serious Apex JetBrains tool besides
  JetForcer.** Both IC2 and JetForcer users represent the full reachable
  JetBrains Apex TAM.
- JetBrains IDEA is the most popular Java IDE overall (84% of Java
  developers in 2025; source: JetBrains State of Developer Ecosystem
  2025, devecosystem-2025.jetbrains.com), and Apex is syntactically
  close to Java, which partly explains IC2's appeal.
- VS Code has 75.1% Salesforce developer share (Salesforce Ben 2025).
  The VS Code audience is 10× larger but is served by Salesforce's
  own free tooling.

### 3.3 Addressable market verdict

The JetBrains Apex niche is real but small: ~5,000–7,000 developers
globally. A complementary plugin cannot exceed IC2's own user base as
a ceiling, and IC2's user base itself is a niche of a niche. **This is
a decisive market-size constraint.** Revenue ceiling is sub-$100K ARR.

---

## 4. Build-Effort Estimate

### 4.1 IntelliJ Platform SDK language requirements

- IntelliJ Platform plugins **require Kotlin or Java**. TypeScript and
  Python cannot be used for production distributable plugins.
  Source: JetBrains support community
  (intellij-support.jetbrains.com/hc/en-us/community/posts/4467583956754-Kotlin-vs-Java-vs-JS-TS-for-plugin-development).
- Kotlin 2.x is **required** for plugins targeting IntelliJ IDEA 2025.1+.
- The IntelliJ Platform Gradle Plugin provides a preconfigured
  project template; build tooling is standard Gradle.
- Using Kotlin to write plugins is similar to Java; the SDK is
  well-documented.

### 4.2 Feasibility for an autonomous agent (strong in TypeScript/Python)

**This is a significant feasibility constraint.** Kotlin is syntactically
similar to Java/Scala and is learnable, but it is NOT in the same
bucket as TypeScript or Python. An autonomous agent building a
production IntelliJ plugin in Kotlin must:
1. Write JVM code (memory model, null safety, coroutines)
2. Work with the IntelliJ Platform API (PSI tree — Program Structure
   Interface — for Apex code parsing; heavily internal JetBrains API)
3. Handle IDE threading model (read actions, write actions, EDT)
4. Maintain compatibility across IntelliJ IDEA 2024.3–2026.x (breaking
   API changes documented in api-changes-list-*.html; non-trivial)

An agent can write Kotlin, but doing so at production quality for a
non-trivial IntelliJ plugin (with PSI traversal for Apex parsing) is
**meaningfully harder** than writing a TypeScript CLI or Python web
service. The PSI API for Apex is NOT bundled in IntelliJ IDEA; it is
inside Illuminated Cloud 2 and the Apex language plugin provided by
either IC2 or JetForcer. A governor-limit analyzer that doesn't
piggyback on IC2's PSI model would need to either:
  - (a) Write its own Apex parser (weeks of work, high error surface), or
  - (b) Declare a plugin dependency on IC2 (coupling to a single-developer
        third-party product that could change or discontinue)
  - (c) Use the raw file text + regex/simple parsing (fragile, limited)

**Build complexity: HIGH for a quality implementation.** A minimal
PoC is achievable; a production plugin with accurate Apex flow analysis
(not just regex-level SOQL-in-loop detection) is a multi-month project
even for a skilled Kotlin developer.

### 4.3 Phase estimates

| Phase | Work | Estimated cycles |
|---|---|---|
| Phase 1 | IntelliJ plugin scaffold, Gradle setup, Marketplace metadata, CI | 2–3 |
| Phase 2 | Apex file parsing (option: text-based regex for SOQL/DML-in-loop) | 4–6 |
| Phase 2b | Gutter annotations, severity icons, inspection framework | 3–4 |
| Phase 2c | "Fix it" quick-fixes for top 3 patterns | 4–6 |
| Phase 3 | License/trial client (JetBrains handles billing; mostly Marketplace config) | 1–2 |
| Phase 4 | Telemetry (opt-in, usage count only) | 1–2 |
| Phase 5 | Compatibility testing across IDEA versions, polish, ship-gate | 3–5 |
| **Total** | | **18–28 cycles** |

Comparison: BidDiff took ~20 cycles for a TypeScript CLI. This plugin,
in Kotlin, targeting an unfamiliar JVM/IntelliJ SDK, is similar in
scope but materially riskier due to language and SDK unfamiliarity.

---

## 5. Risk Register (Updated)

1. **Salesforce/JetBrains tooling roadmap**: ApexGuru is actively being
   extended. As of April 2026 it integrates into MCP-compatible clients
   (Claude Code, Cursor, Cline). If Salesforce or JetBrains creates a
   first-party governor-limit plugin for IntelliJ, the plugin is made
   redundant. **Probability: Medium (12–18 month horizon).**

2. **VS Code drift**: 75.1% of Salesforce developers already use VS Code
   (2025 survey). The JetBrains share could erode further as VS Code
   tooling improves. AI-assisted development (Cursor, Cline, Claude Code)
   runs on VS Code more natively than IntelliJ. **Probability: Medium-High.**

3. **Illuminated Cloud bundling**: Scott Wells could add governor-limit
   annotations to IC2 in a future release, eliminating the gap. IC2 is
   actively maintained (last update March 2026). **Probability: Medium.**

4. **Build-feasibility risk**: Kotlin PSI-based Apex analysis requires
   deep IntelliJ API knowledge. A fragile text-regex approach would ship
   faster but deliver lower quality and receive negative reviews.
   **Probability of quality shortfall: High if rushed.**

5. **Single-developer dependency of the incumbent**: IC2 being solo-developer
   maintained is a *market risk* — if IC2 is abandoned, the entire JetBrains
   Apex ecosystem collapses, taking this plugin's distribution surface with it.
   **Probability: Low short-term, Medium 3+ year.**

6. **AI commoditization**: LLMs (Claude Code, Copilot, etc.) already detect
   SOQL-in-loops when asked. The value proposition must be *ambient IDE
   integration* (zero-friction, no prompt required), not analysis quality.

7. **JetBrains API compatibility churn**: Breaking changes documented in
   api-changes-list-2025.html and api-changes-list-2026.html. Requires
   ongoing maintenance budget every IDE major release cycle (~2/year).

---

## 6. Feature Recommendation: Governor-Limit Static Analyzer

### Why this feature, not the others

**Candidates ranked:**

| Feature | Gap vs IC2 | Competitor coverage | Build complexity | Uniqueness |
|---|---|---|---|---|
| **Governor-limit static analysis** | IC2 has no inline limit warnings | ApexGuru exists but VS Code only; PMD plugin unmaintained | Medium-High | HIGH — no live JetBrains plugin does this well |
| Multi-org diff | IC2 has no org comparison | External tools (sforgcompare, Metazoa, BlueCanvas) exist | Very High (requires 2-org API calls) | Medium — existing tools already serve this need |
| Apex SOQL refactoring | IC2 has basic refactoring; JetForcer has more | Both incumbents partially cover this | High | Low — incumbents already do this |
| Test coverage visualization | IC2 uses IDE's built-in coverage coloring | VS Code has the same | Medium | Low — already solved in both ecosystems |
| Deployment diff | External to IDE | Many external tools (Gearset, BlueCanvas) | Very High | Low — market is served |

**Chosen feature: Governor-Limit Static Analyzer (real-time inline)**

**Reasoning:**
1. **Genuine gap on JetBrains**: ApexGuru (the best current governor-limit
   analysis tool) is **VS Code-only** as of 2026. JetBrains IC2 users have
   no equivalent. The PMD IntelliJ plugin is unmaintained for Apex.
2. **Daily pain point**: Governor limit violations are the #1 runtime
   failure category for Apex developers (SOQL 101 limit, DML 150 limit,
   CPU 10,000ms limit). They are caught at runtime today, not at
   edit-time in JetBrains.
3. **Defensible scope**: A focused analyzer for 5–8 top limit patterns
   (SOQL/DML in loops, aggregate queries inside triggers, callouts in
   loops, heap-heavy string operations) is buildable with text/AST-level
   analysis without requiring full Apex type inference.
4. **Ambient value proposition**: The key differentiator vs. asking an
   LLM is zero-friction, always-on gutter annotations — no prompt
   required, no copy-paste, no round trip.
5. **Not easily bundled by IC2**: Scott Wells has not added this in 10+
   years; the focus of IC2 is Salesforce platform integration, not
   static analysis. Adding a full governor-limit analysis engine is a
   separate product decision.

**Specific feature set:**
- Real-time gutter annotations classifying each warning by limit category
  (SOQL, DML, CPU, Heap, Callout)
- Severity: P0 = guaranteed limit breach pattern (SOQL inside for-loop),
  P1 = likely issue (large collections in trigger without guard), P2 =
  advisory (nested SOQL without selective filter)
- Inline "Fix it" quick-actions for the P0 patterns (extract SOQL outside
  loop, add bulk-safe list accumulation)
- Per-class "limit risk dashboard" panel showing the top 3 hotspots
- **Does NOT require Apex type inference** for the P0/P1 patterns —
  syntactic loop-body scanning is sufficient for 80% of value.

---

## 7. Why This Might Fail (Mandatory Honest Analysis — Updated)

1. **The JetBrains Apex audience is genuinely small.** ~5,000–7,000 total
   JetBrains Apex users globally. Even with strong conversion, revenue
   ceiling is sub-$100K ARR net. For a software factory optimizing for
   products with $500K+ ARR potential, this is below the ambition threshold.

2. **VS Code is winning, not JetBrains.** VS Code holds 75.1% of the
   Salesforce developer market and is growing with Salesforce's official
   investment (ApexGuru, Code Analyzer, Code Builder all target VS Code
   first). Developing for the 7.1% JetBrains slice is swimming against the
   current.

3. **ApexGuru via MCP server (April 2026 release) partially closes the gap
   already.** JetBrains users can now invoke ApexGuru analysis via the
   Salesforce DX MCP Server in any MCP-compatible client, including
   JetBrains AI Assistant (which supports MCP). This reduces — but does
   not eliminate — the ambient-IDE-integration gap.

4. **Kotlin/IntelliJ Platform SDK is a genuine feasibility obstacle.** The
   autonomous agent has strong TypeScript/Python skills but limited Kotlin
   and zero IntelliJ PSI API experience. Build time and quality risk are
   both elevated. A poorly-executed plugin (false positives, crashes on IC2
   incompatibility) would earn negative reviews and kill the product.

5. **Dependency on IC2 for distribution.** If IC2 is ever abandoned by
   Scott Wells, the JetBrains Apex ecosystem collapses. The plugin's
   distribution surface depends on a single third-party developer's continued
   commitment.

6. **No precedent revenue.** Unlike the original "Proven" evidence tier
   assumption, no publicly documented revenue figure exists for a paid
   JetBrains plugin in the Apex niche or a directly comparable tiny-language
   niche. BashSupport Pro is the closest analog but its revenue is not public.

---

## 8. Evidence Tier (Revised)

**Verdict: PLAUSIBLE (downgraded from provisional "Proven")**

Justification:
- Proven requires: comparable paid plugin in this niche with documented
  revenue at the projected ceiling. This evidence does not exist.
- Plausible is supported by:
  - Confirmed IC2 pricing ($90–$125/yr) demonstrating Apex developers pay
    for JetBrains Salesforce tooling
  - 7.1% adoption rate (Salesforce Ben 2025 survey) confirming the JetBrains
    Apex niche exists
  - Genuine gap confirmed: ApexGuru and Code Analyzer are VS Code-only
  - JetBrains 15% revenue share confirmed from official documentation
  - BashSupport Pro structural precedent (niche language, one developer, paid)
- Speculative concerns:
  - No conversion rate benchmarks for JetBrains Marketplace (not public)
  - No confirmed revenue floor from a comparable plugin

---

## 9. Scoring Model (Final)

**Scoring method:** score × weight, summed to weighted total out of 100.

| Factor | Weight | Score (0-10) | Weighted | Reasoning |
|---|---:|---:|---:|---|
| Revenue ceiling | 18 | 4 | 72 | ~$100K ARR net ceiling. Small but real. Below the $500K+ ambition tier. |
| Probability of reaching ceiling | 14 | 4 | 56 | Requires strong conversion in a niche of ~5,000 users. Kotlin build risk. 3–5 year horizon to ceiling. |
| Distribution quality | 14 | 7 | 98 | JetBrains Marketplace is high-intent (developers searching for tools). But small audience. |
| Maintenance fit | 10 | 5 | 50 | JetBrains major-version API churn ~2x/year. IntelliJ Platform breaking changes are well-documented but require active Kotlin maintenance indefinitely. |
| Build feasibility | 10 | 4 | 40 | Kotlin + IntelliJ PSI API is a new stack for the agent. Text-level analysis feasible; production-quality PSI traversal is high-risk. |
| Self-serve monetization | 8 | 9 | 72 | JetBrains handles all billing, trials, renewals. Near-perfect self-serve. |
| Defensibility | 8 | 4 | 32 | ApexGuru encroachment via MCP is real. IC2 could bundle similar analysis. PMD ecosystem may improve. |
| Evidence quality | 10 | 4 | 40 | Plausible tier: IC2 pricing confirmed, audience share confirmed, gap confirmed. No revenue comps, no conversion data. |
| Strategic fit | 8 | 6 | 48 | First "marketplace-distributed paid plugin" playbook is valuable for the factory. But Kotlin is a new stack investment that won't compound into other products easily. |
| **Total** | **100** | — | **508** | **5.08 / 10.0** |

**Weighted score: 508/1000 (5.08 out of 10.0)**

**Interpretation:** This score is below the 6.0 threshold that would warrant
auto-proceeding as Rank-1. It scores low primarily on revenue ceiling,
probability of reaching ceiling, build feasibility, and defensibility.

---

## 10. Final Recommendation

### Proceed or Pivot?

**PIVOT RECOMMENDATION: Do not build this as the next product.**

The research reveals a product that is technically feasible but commercially
too small and technically too risky for the factory's ambitions:

1. The JetBrains Apex niche is real but caps out at ~$100K ARR net. The
   factory's SCORING_MODEL targets higher ceilings for Rank-1 products.

2. The build requires a new JVM/Kotlin stack that does not compound into
   future products (unlike TypeScript, Python, or web tooling).

3. ApexGuru via MCP server (April 2026) is already partially closing the
   gap for tech-forward users. The defensibility window is narrowing.

4. The 7.1% JetBrains share of a 75,000-person market = ~5,000 users is a
   permanently capped TAM; VS Code dominance is accelerating.

### If the human wants to proceed anyway (e.g., as a learning/playbook exercise)

The build should target the governor-limit static analyzer with a
**text-analysis-level MVP** (not full PSI traversal), positioned explicitly
as a **complements IC2** product. Minimum viable scope: detect SOQL-in-loops
and DML-in-loops with gutter warnings in ~8 cycles total (Phases 1–3 only),
list as free with a paid "pro" tier for fix-it actions, and evaluate traction
before investing further.

### What should be Rank-1 instead?

Per `brain/RANKING.md`, re-evaluate the ranked candidates that target:
- Larger developer populations (TypeScript/JavaScript, Python, or general
  web developer tooling)
- VS Code Marketplace products (10× larger Salesforce audience alone; 75.9%
  overall dev market share for VS Code)
- CLI/web products not dependent on a specific IDE ecosystem
- Products where the agent's TypeScript/Python/web strengths compound directly

---

## 11. Proposed APPROVALS.md Entry (ready to post)

```
## PROPOSAL: JetBrains Apex Governor-Limit Analyzer plugin
**Status:** Pending human decision — RESEARCH RECOMMENDS PIVOT

**One-paragraph summary:** A paid JetBrains IDE plugin that provides
real-time inline governor-limit static analysis for Salesforce Apex code
(SOQL-in-loops, DML-in-loops, heap risks, callout patterns), filling the
gap left by Illuminated Cloud 2 and the VS Code-only ApexGuru tool. The
plugin would be listed on the JetBrains Marketplace at ~$49–$79/year,
handled by JetBrains billing (85% developer share).

**Chosen sub-feature:** Governor-Limit Static Analyzer (gutter
annotations, severity heatmap, quick-fix actions for P0 patterns)

**Evidence tier:** PLAUSIBLE

**Score:** 5.08 / 10.0 (below 6.0 auto-proceed threshold)

**Research recommendation:** PIVOT. Revenue ceiling ~$100K ARR net;
build requires new Kotlin/IntelliJ stack; VS Code dominance is
accelerating; ApexGuru MCP integration partially closes the gap already.

**If human approves anyway:** Begin with 8-cycle text-analysis MVP
(no full PSI traversal), free tier + paid "pro" tier. Evaluate traction
at 500 installs before investing in deeper analysis.

**Auto-proceed deadline:** N/A (research recommends pivot; human
decision required to override)

**Research file:** brain/RESEARCH/2026-05-27-jetbrains-apex-plugin.md
**Date:** 2026-06-06
```

---

## Sources Cited

1. JetBrains Marketplace — Illuminated Cloud 2: https://plugins.jetbrains.com/plugin/10253-illuminated-cloud-2
2. JetBrains Marketplace — Illuminated Cloud (v1): https://plugins.jetbrains.com/plugin/7831-illuminated-cloud
3. JetBrains Marketplace — JetForcer pricing: https://plugins.jetbrains.com/plugin/9238-jetforcer--the-smartest-force-com-ide/pricing
4. Illuminated Cloud 2.0 Release Details (pricing): https://groups.google.com/a/illuminatedcloud.com/g/announcements/c/6c77Fur3JfA
5. Insight.com — IC2 Commercial License listing: https://www.insight.com/en_US/shop/product/ILLCLOUD2CSL-I1IC/illuminated%20cloud/ILLCLOUD2CSL/Illuminated-Cloud-2-Commercial-License/
6. G2 — Illuminated Cloud reviews: https://www.g2.com/products/illuminated-cloud/reviews
7. Salesforce Ben — 2025 Developer Survey key insights: https://www.salesforceben.com/4-key-insights-from-our-2025-salesforce-developer-survey-results/
8. Salesforce Ben — Most commonly used developer tools: https://www.salesforceben.com/what-are-the-most-commonly-used-salesforce-developer-tools/
9. SyncGTM — How many Salesforce developers: https://www.syncgtm.com/blog/how-many-sales-force-developers-are-there
10. JetBrains — Revenue sharing documentation: https://plugins.jetbrains.com/docs/marketplace/revenue-sharing-and-fees.html
11. JetBrains YouTrack — Revenue sharing and fees KB: https://youtrack.jetbrains.com/articles/SUPPORT-A-1776/Revenue-sharing-and-JetBrains-fee-for-plugins-sold-via-Marketplace
12. JetBrains Developer Agreement (1.1): https://www.jetbrains.com/legal/docs/plugins_site/developer-agreement/1.1/1.1.pdf
13. Salesforce Extensions for VS Code overview: https://developer.salesforce.com/docs/platform/sfvscode-extensions/overview
14. Salesforce Code Analyzer — VS Code Extension: https://developer.salesforce.com/docs/platform/salesforce-code-analyzer/guide/analyze-vscode.html
15. ApexGuru — Performance-First Development with MCP Server (Apr 2026): https://developer.salesforce.com/blogs/2026/04/performance-first-apex-development-with-apexguru-in-salesforce-dx-mcp-server
16. ApexGuru — Agentic Code Fixing (Sep 2025): https://developer.salesforce.com/blogs/2025/09/inside-apexguru-agentic-code-fixing
17. ApexGuru — Optimize Your Apex (Feb 2025): https://developer.salesforce.com/blogs/2025/02/optimize-your-apex-for-apps-and-agentforce-with-apexguru
18. Salesforce Inspector Reloaded — GitHub: https://github.com/tprouvot/Salesforce-Inspector-reloaded
19. Salesforce Inspector Reloaded — Salesforce Developers Blog: https://developer.salesforce.com/blogs/2024/07/improve-your-productivity-with-salesforce-inspector-reloaded
20. Flosum — Best static code analysis tools for Salesforce: https://www.flosum.com/blog/best-static-code-analysis-tools
21. AutoRABIT CodeScan: https://www.autorabit.com/products/codescan-static-code-analysis/
22. Qualimetry Apex Analyzer (IntelliJ): https://plugins.jetbrains.com/plugin/30781-qualimetry-apex-analyzer
23. PMD — Apex performance rules: https://pmd.github.io/pmd/pmd_rules_apex_performance.html
24. PMD-IntelliJ GitHub issue (unmaintained): https://github.com/amitdev/PMD-Intellij/issues/33
25. Welkin Suite pricing: https://welkinsuite.com/the-welkin-suites-pricing-plans
26. BashSupport Pro — Future of BashSupport: https://www.bashsupport.com/news/bashsupport-future/
27. BashSupport Pro — 2024 pricing update: https://www.bashsupport.com/news/2024-pricing-update/
28. Scott Wells / Rose Silver Software — Crunchbase: https://www.crunchbase.com/person/scott-wells-c4f3
29. JetBrains — Kotlin for Plugin Developers: https://plugins.jetbrains.com/docs/intellij/using-kotlin.html
30. JetBrains support — Kotlin vs Java vs JS/TS for plugin dev: https://intellij-support.jetbrains.com/hc/en-us/community/posts/4467583956754-Kotlin-vs-Java-vs-JS-TS-for-plugin-development
31. JetBrains — IntelliJ Platform API changes 2025: https://plugins.jetbrains.com/docs/intellij/api-changes-list-2025.html
32. JetBrains — State of Developer Ecosystem 2025: https://devecosystem-2025.jetbrains.com/
33. JetBrains Blog — IntelliJ IDEA #1 Java IDE (84% 2025): https://blog.jetbrains.com/research/2025/10/state-of-developer-ecosystem-2025/
34. Salesforce Ben — Global supply vs demand 2025: https://www.salesforceben.com/global-supply-vs-demand-for-salesforce-roles-in-2025-what-the-numbers-say/
35. DevOps Launchpad — Best Salesforce code review tools 2026: https://devopslaunchpad.com/blog/best-salesforce-code-review-tools/
36. Blue Canvas — Salesforce DevOps toolset 2025: https://bluecanvas.io/blog/complete-devops-toolset-for-salesforce-in-2025-in-depth-review-blue-canvas
37. sforgcompare — org comparison tool: https://sforgcompare.herokuapp.com/
38. Salesforce Ben — What are governor limits: https://www.salesforceben.com/what-are-salesforce-governor-limits-best-practices-examples/
39. JetBrains Marketplace — Paid plugins documentation: https://plugins.jetbrains.com/docs/marketplace/paid-plugins.html
40. JetBrains Marketplace — Plugin monetization: https://plugins.jetbrains.com/docs/marketplace/plugin-monetization.html

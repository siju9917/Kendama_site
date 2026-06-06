# APPROVALS.md — the fast veto gate

> When the decision engine promotes an idea to "ready to build,"
> it posts the proposal here: the idea, its deep evaluation
> summary, its score, and the reasoning. The human's job is a
> fast **yes / no / redirect**.
>
> To keep the factory from stalling: each proposal has an
> auto-proceed window. If the human does not respond within the
> window, the factory proceeds. **The gate exists for the human to
> *catch* a bad call, not to *make* the call.** Minutes per week,
> not hours.

## Auto-proceed window

**Default:** 7 days from the date the proposal was posted.

The window is per-proposal and can be edited in the proposal body
itself. A proposal whose window is shorter than 7 days must
justify the shorter window in the body.

## Response format

To respond, edit the proposal's "**Status:**" line:

- `Status: APPROVED on YYYY-MM-DD by human` — the factory begins
  building on the next cycle.
- `Status: REJECTED on YYYY-MM-DD by human, reason: <why>` — the
  factory removes the idea from the active candidate set and
  logs the reasoning in `brain/DECISIONS.md`.
- `Status: REDIRECT on YYYY-MM-DD by human, redirect: <new
  direction>` — the factory revises the proposal per the
  redirect and re-posts.

---

## Open proposals

### Proposal #4 — VS Code Terraform Plan Classifier (factory recommendation: PROCEED, after Proposal #3)

- **Posted:** 2026-06-06
- **Auto-proceed window:** 7 days — defaults to **PROCEED** (build D6 after D5) if no response by 2026-06-13
- **Status:** _awaiting human response_
- **Source:** Deep evaluation completed 2026-06-06. Full research at `brain/RESEARCH/2026-06-06-terraform-plan-classifier.md`
- **Factory recommendation: PROCEED after D5** — score 641/1000 (slightly outscores D5 at 636). Same VS Code extension scaffold as Proposal #3; D6 is the second build in the pipeline.

**Executive summary:**

A VS Code extension that reads `terraform plan` output and classifies each proposed change by blast radius: CRITICAL (resource replacement/destroy, data-store deletion, IAM/security-group widening) vs NORMAL (in-place attribute tweaks). Every `terraform apply` is a held breath — the operator scans change lines for the one that will replace the prod database. The wedge: all incumbents (Spacelift, env0, Terraform Cloud) are CI/cloud-gated; zero existing VS Code extensions do on-device CRITICAL/NORMAL blast-radius classification.

**Key evidence:**
1. **Category proven by Infracost:** $17M+ revenue, $15M Series A (November 2025, Pruven Capital + YC + Sequoia), 3,500+ customers including 10% of Fortune 500. Plan annotation in the IDE is a real, fundable market.
2. **Gap confirmed:** Exhaustive search found zero VS Code extensions doing on-device destructive-change classification from plan JSON. HashiCorp official runs terraform but does zero plan analysis. TerraScope does diff visualization, no severity classification. Scalr requires Scalr subscription.
3. **Filter compliance:** fully on-device (no backend required), TypeScript, VS Code Marketplace organic discovery. Plan JSON schema stable since Terraform 0.12 with documented backward-compat.
4. **Security wedge documented:** "Bucket full of secrets" incident (Mercari, 2023) proves enterprise security reviewers have explicit justification for on-device vs. hosted plan analysis.
5. **Sequencing:** D6 builds AFTER D5 (Proposal #3) — D5 provides the VS Code extension scaffold D6 reuses.

**Full scoring:**

| Factor | Weight | Score | Weighted |
|---|---:|---:|---:|
| Revenue ceiling | 18 | 6 | 108 |
| Probability | 14 | 5 | 70 |
| Distribution quality | 14 | 8 | 112 |
| Maintenance fit | 10 | 9 | 90 |
| Build feasibility | 10 | 8 | 80 |
| Self-serve monetization | 8 | 5 | 40 |
| Defensibility | 8 | 6 | 48 |
| Evidence quality | 10 | 5 | 50 |
| Strategic fit | 8 | 9 | 72 |
| **Total** | **100** | | **670 (mid: 641)** |

**Your options:**
- `Status: APPROVED on YYYY-MM-DD by human — build D6 after D5 ships` — factory sequences D6 after BidDiff + D5
- `Status: REDIRECT on YYYY-MM-DD by human — build D6 BEFORE D5` — if you prefer the terraform/DevOps market over OpenAPI first
- `Status: REJECTED on YYYY-MM-DD by human — reason: <why>` — factory removes from build queue

**Auto-proceed default:** PROCEED (after D5). If no response by 2026-06-13, factory builds D6 after D5 ships.

---

### Proposal #3 — VS Code OpenAPI Breaking-Change Lens (factory recommendation: PROCEED)

- **Posted:** 2026-06-06
- **Auto-proceed window:** 7 days — defaults to **PROCEED** (build the free OpenAPI beachhead) if no response by 2026-06-13
- **Status:** _awaiting human response_
- **Source:** Deep evaluation completed 2026-06-06. Full research at `brain/RESEARCH/2026-06-06-vscode-breaking-change-lens.md`
- **Factory recommendation: PROCEED** — score 636/1000 clears the 600 auto-proceed threshold. Build the free OpenAPI beachhead; gate paid tier on 1,000 installs.

**Executive summary:**

A VS Code extension that detects breaking changes in OpenAPI schemas and annotates them inline. Every changed OpenAPI endpoint, field, or response schema is classified BREAKING, SAFE, or INFO with a hover explanation — **as you edit, before CI runs, before the PR is opened.**

The gap: oasdiff (the leading breaking-change library, 1,116 GitHub stars, enterprise users at Adyen/Elastic/Wiz) has no VS Code extension. Azure API Center (Microsoft) has inline breaking-change detection but only for Azure-managed APIs. The general-purpose slot is unoccupied.

**Key evidence:**
1. **IDE gap is real:** exhaustive search found zero free-standing VS Code extensions for OpenAPI breaking-change detection. The 42Crunch extension (~500K installs) focuses on security, not breaking changes. Microsoft validates the IDE-native pattern by building it for Azure — but gated it behind Azure API Center.
2. **Demand confirmed:** oasdiff has 450+ documented breaking-change rule categories (real users filed those rules); Pro tier at $100/month/team (they offer paid → they believe in the market). SmartBear 2024: 63% of API teams use OpenAPI.
3. **Filter compliance:** fully on-device, TypeScript, VS Code Marketplace organic discovery, LemonSqueezy license keys. All three hard filters pass cleanly.
4. **Strategic fit:** BidDiff's "align → diff → classify" engine generalizes directly to OpenAPI. The rule pack is the only new work; the engine is reused.
5. **Risk:** oasdiff can ship a VS Code extension in 3–6 months — install velocity matters. Build quickly.

**Full scoring (SCORING_MODEL):**

| Factor | Weight | Score | Weighted |
|---|---:|---:|---:|
| Revenue ceiling | 18 | 5 | 90 |
| Probability | 14 | 4 | 56 |
| Distribution | 14 | 9 | 126 |
| Maintenance fit | 10 | 9 | 90 |
| Build feasibility | 10 | 8 | 80 |
| Self-serve monetization | 8 | 6 | 48 |
| Defensibility | 8 | 4 | 32 |
| Evidence quality | 10 | 5 | 50 |
| Strategic fit | 8 | 8 | 64 |
| **Total** | **100** | | **636/1000 (6.36)** |

**Portfolio rule note:** All evaluated candidates (BidDiff, Apex, clauseguard, Breaking-Change Lens) are PLAUSIBLE tier — no Proven comparables exist for on-device federal solicitation or OpenAPI IDE tooling. This is an honest finding, not a gap to paper over. Building the highest-scoring Plausible candidate is correct; the portfolio rule is against majority-Speculative, not against majority-Plausible.

**Build sequence (if approved):**
- **Phase 0 (zero-cost):** ~~Factory builds the OpenAPI rule engine + engine adapter in TypeScript. This can start before the human sets up VS Code Marketplace publisher registration.~~ **COMPLETED 2026-06-06 (ahead of proposal auto-proceed).** Engine is at `products/openapi-lens/`. **458/458 tests** passing (17 adversarial hardening rounds + 1 Swagger 2.0 parser bug fix; all OapiSchema fields covered at all levels: top-level body, per-property, items, parameter, parameter.items; null-transition fixes for response constraints (rounds 13–14), request-side constraint removal (round 15), additionalProperties:false schema-closing detection (round 16), pattern constraint null-transition fixes at 6 sites (round 17)). Full type system, 80+ breaking-change rules. Zero VS Code dependency yet.
- **Phase 1–2:** VS Code extension scaffold + OpenAPI diff core (~6 build sessions). Begins on auto-proceed 2026-06-13 (or earlier if approved).
- **Gate:** Publish free on VS Code Marketplace; gate paid tier on 1,000 installs.
- **Human gate (one-time):** VS Code Marketplace publisher registration (free personal account; or $100 org account requires approval per PRODUCT_CONSTRAINTS.md). Log to `NEED_FROM_HUMAN.md`.

**Relationship to BidDiff:** BidDiff is the active build and ships first. This product enters the build queue upon BidDiff's ship. No conflict.

**Your options:**
- `Status: APPROVED on YYYY-MM-DD by human — PROCEED with OpenAPI beachhead` — factory builds after BidDiff ships.
- `Status: REDIRECT on YYYY-MM-DD by human — use Terraform as beachhead instead of OpenAPI` — factory pivots to Terraform as the first format (smaller audience, stronger on-device trust wedge, no existing free tooling).
- `Status: REJECTED on YYYY-MM-DD by human — reason: <why>` — factory removes and continues evaluating D4 Shopify or rank-2 FAR/DFARS MCP.

**Auto-proceed default:** PROCEED (factory's recommendation). If no response by 2026-06-13, factory begins building the OpenAPI beachhead upon BidDiff's ship gate.

---

### Proposal #2 — JetBrains Apex plugin: PIVOT recommended (factory recommendation: REJECT)

- **Posted:** 2026-06-06
- **Auto-proceed window:** 7 days — defaults to **REJECT** if no response by 2026-06-13
- **Status:** _awaiting human response_
- **Source:** Deep evaluation completed 2026-06-06. Full research at `brain/RESEARCH/2026-05-27-jetbrains-apex-plugin.md`
- **Factory recommendation: REJECT this candidate and remove from the active build queue.** Evidence below.

**Evidence summary:**

The deep evaluation (web-cited research, 2026-06-06) revealed the JetBrains Apex plugin is too small and too risky for the factory:

1. **TAM too small:** ~5,000–7,000 JetBrains Apex developers globally. Revenue ceiling ~$100K ARR net even at strong conversion — below the factory's ambition threshold.
2. **Build stack mismatch:** IntelliJ Platform plugins require **Kotlin or Java** (not TypeScript/Python). This is a genuine feasibility obstacle for an autonomous TypeScript agent. Quality risk is high.
3. **VS Code is winning:** VS Code has 75.1% of the Salesforce developer market; JetBrains has 7.1% and is not growing. Salesforce invests all first-party tooling (ApexGuru, Code Analyzer) in VS Code.
4. **ApexGuru via MCP (April 2026) is already closing the gap** via the Salesforce DX MCP Server — the defensibility window is narrowing.
5. **Evidence tier: PLAUSIBLE** (downgraded from provisional "Proven" — no Proven comparable revenue found in the JetBrains Apex niche).

**Full scoring (SCORING_MODEL):**

| Factor | Weight | Score | Weighted |
|---|---:|---:|---:|
| Revenue ceiling | 18 | 4 | 72 |
| Probability | 14 | 4 | 56 |
| Distribution | 14 | 7 | 98 |
| Maintenance fit | 10 | 5 | 50 |
| Build feasibility | 10 | 4 | 40 |
| Self-serve monetization | 8 | 9 | 72 |
| Defensibility | 8 | 4 | 32 |
| Evidence quality | 10 | 4 | 40 |
| Strategic fit | 8 | 6 | 48 |
| **Total** | **100** | | **508/1000 (5.08)** |

**Your options:**
- `Status: APPROVED on YYYY-MM-DD by human — REJECT` — factory removes from build queue, continues to next candidate (D2 clauseguard or D5/D6 VS Code extensions, all TypeScript-buildable).
- `Status: REDIRECT on YYYY-MM-DD by human — proceed anyway, accept the Kotlin risk` — factory will build the governor-limit static analyzer MVP per the research.

**Auto-proceed default:** REJECT (factory's recommendation). If no response by 2026-06-13, the factory removes this candidate from the active queue and proceeds to the next candidate.

---

### Proposal #1 — BidDiff positioning decision

- **Posted:** 2026-05-27
- **Auto-proceed window:** 7 days from posting (defaults to
  **REPOSITION** if no response by 2026-06-03)
- **Status:** AUTO-PROCEEDED on 2026-06-06 (window elapsed 2026-06-03 with no human response) — applying REPOSITION default: BidDiff repositions to "individual proposal-manager amendment triage" per option A.
- **Source finding:** Ambition Critic (#13) finding in
  `products/biddiff/CRITIQUE_LOG.md` (Phase K1, pass 1)
- **Why a proposal and not an autonomous decision:** the
  choice changes what the product *is*, not just what's in
  it. The factory does not have the authority to make a
  positioning call this material without confirmation.

**The question:**

BidDiff currently positions itself as a tool for "proposal /
capture teams." Its actual feature set is an **individual**
read-only diff tool. There is no multi-amendment timeline, no
team collaboration (assign / resolve / discuss findings), no
capture-tool integrations, no FAR-clause interaction surfacing.
A real capture team would feel the gap within the first few
sessions of use.

You have three options:

**A. Reposition** (recommended default; the auto-proceed
lands here)

- Change the Web Store listing, in-app subtitle, and
  marketing positioning to "Individual proposal-manager
  amendment triage."
- Pros: cheap (~1 cycle of polish work); honest; sharpens the
  buyer audience to one BidDiff actually serves well.
- Cons: surrenders the (larger but unserved) team-tool market
  to potential future competitors.

**B. Extend the scope to genuinely serve teams**

- Add: multi-amendment timeline view; team collaboration
  (assign, mark resolved, comment); at least one capture-tool
  integration stub (Salesforce or Anaplan).
- Estimated effort: 4-6 BUILD cycles (cycle = one Saturday).
- Pros: matches the larger market; aligns positioning with
  product.
- Cons: significant delay to ship; demand for these features
  has not been validated (the Research Quality finding is
  open separately); risk of building unwanted features.

**C. Ship as-is with documented intent**

- Ship the individual-tool feature set under the current
  positioning, with explicit roadmap text in the listing
  stating that team features are planned.
- Pros: fastest ship.
- Cons: highest review-risk option. The factory's quality
  bar treats negative review momentum as a real risk; this
  is the least-defensible of the three.

**Your response format:**

Edit the `Status:` line above with one of:

- `Status: APPROVED on YYYY-MM-DD by human — option A (reposition)`
- `Status: APPROVED on YYYY-MM-DD by human — option B (extend scope; willing to wait 4-6 cycles)`
- `Status: APPROVED on YYYY-MM-DD by human — option C (ship as-is with roadmap)`
- `Status: REDIRECT on YYYY-MM-DD by human — <other option in your own words>`

---

## Closed proposals (audit trail)

### Proposal #1 — BidDiff positioning decision (AUTO-PROCEEDED 2026-06-06)

Window elapsed 2026-06-03 with no human response. Factory applied option A
(REPOSITION to "individual proposal-manager amendment triage"). See
`human/NEED_FROM_HUMAN.md` item 3 for the full list of copy changes applied.

---

## Working notes

- The factory **does not edit prior proposals' status lines** —
  only the human does. (The factory may append further analysis
  to a proposal body in response to a redirect.)
- A proposal that auto-proceeds (window elapsed without response)
  has its status updated by the factory to `Status: AUTO-PROCEEDED
  on YYYY-MM-DD (window elapsed)` so the audit trail is clean.
- A proposal must include: the idea name, evidence tier, total
  score, sub-scores, the deep evaluation summary, links to the
  deep evaluation file under `brain/RESEARCH/`, and the
  auto-proceed deadline.

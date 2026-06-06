# MARKET_SIGNALS.md — observations from monitoring

> Running output of the RESEARCH loop's monitoring task. New
> platforms, competitor launches, pricing shifts, emerging buyer
> classes, dying markets. Each signal becomes a candidate idea or
> a re-rank trigger.

Format per signal:

```
## YYYY-MM-DD — <short title>

**Source:** URL or origin.
**Signal:** what changed in the world.
**Implication for Kendama:** does this open a new opportunity,
threaten an existing product, or shift a ranking?
**Action:** what the factory does about it now.
```

---

## 2026-05-27 — (bootstrap; no live signals yet)

The first formal monitoring sweep runs on the next RESEARCH loop
cycle. Bootstrap status; the human's prior research already
informs `brain/IDEA_BACKLOG.md`.

---

## Standing monitoring targets

The RESEARCH loop refreshes these on every cycle. New targets are
added as the factory discovers them.

- **Chrome Web Store** — new extensions in BidDiff's adjacency
  (federal procurement, document diff, RFP tools). Pricing
  movements.
- **JetBrains Marketplace** — top-grossing paid plugins by category
  (signal for the rank-1 idea); new plugin launches in the Apex
  and Salesforce ecosystem.
- **MCP server registry / catalog** — new servers; emerging
  categories with high install counts (signal for the rank-2
  idea).
- **SAM.gov platform changes** — UI changes, API changes, new
  attachment types; relevant to BidDiff.
- **Federal acquisition regulatory updates** — FAR / DFARS changes
  that would affect BidDiff's clause dataset and the
  clause-currency MCP server's value proposition.
- **Indie-hacker revenue reports** — public posts of MRR by
  category; calibration signal for `governance/SCORING_MODEL.md`
  ceilings.
- **New AI model releases** — capabilities that change which
  products are buildable autonomously vs. defensible.
- **On-device / IDE-native "breaking-change lens" tooling** (added
  2026-05-30, derived from the on-device-trust wedge + the
  Breaking-Change-Lens synthesis in `IDEA_BACKLOG.md`). Watch whether any
  incumbent ships a *free, on-device, IDE-native* classifier of
  breaking/destructive changes for proto / OpenAPI / terraform-plan / SQL —
  that would erode the D3/D5/D6 wedge. Also watch infracost-style "annotate a
  plan/PR in the IDE" tools for the UX + monetization comparable. (This is a
  *monitoring target*, not an observed signal — the cap-unblocked sweep checks
  it.)

---

## 2026-06-06 — D6 Terraform plan classifier: gap remains genuinely unoccupied

**Source:** VS Code Marketplace research sweep (plan-included sub-agent, 2026-06-06).

**Signal:** Surveyed every VS Code extension in the Terraform plan / risk space:
- **HashiCorp Terraform** (7M+ installs, free, official): no plan risk classification.
  Invokes `terraform plan` from command palette but does not parse or classify output.
  Zero destructive-change highlighting.
- **TerraScope** (`alyai.terrascope`, very new/small): takes `terraform show -json` and
  shows a before/after diff viewer. Closest competitor — but it is a visual diff only,
  with no semantic risk classification (no replace/delete/IAM-widening/data-store-delete
  detection). No inline diagnostics.
- **terraform-visualizer** (`claudiom.terraform-visualizer`): dependency graph topology
  only. No risk classification.
- **Infracost** (~100K installs, free tier): cloud-cost FinOps annotations above resource
  blocks as you type. Requires cloud API even for basic cost estimates. Does NOT classify
  destructive changes — explicitly cost-delta focused, not safety/risk focused.
- **Checkov** (Bridgecrew/Prisma): static `.tf` source linting for misconfigurations.
  CAN scan `terraform plan` JSON via CLI, but the VS Code extension does not provide
  inline plan-level risk highlighting — source-file linting only.
- **Snyk IaC**: static source misconfiguration scanner. Not plan-level. No destructive-
  change detection.
- **Blast Radius**: CLI + browser graph tool. Unmaintained, no VS Code extension.
- **Terraform Report Generator**: plan → PDF/HTML export. No inline VS Code highlighting.

**Gap confirmed:** No extension does all of: (1) parse `terraform show -json`, (2) classify
by risk type (replace/delete/IAM-widening/data-store-delete), (3) show inline VS Code
diagnostics, (4) run 100% on-device with no cloud API. The niche is genuinely unoccupied.

**Implication for Kendama:** D6 (Terraform Plan Classifier) wedge is CONFIRMED. The
on-device, inline-diagnostic, semantic-risk-classification gap exists in the VS Code
marketplace as of June 2026. TerraScope (nearest competitor) is brand-new, small, and stops
at visual diff — it validates the demand without filling the risk-classification wedge.
Infracost ($17M Series A Nov 2025) validates the paid-tool market in this space, but
focuses on cost not safety.

**Action:** No re-rank needed — D6 score 641/1000 (CONDITIONAL PROCEED) already incorporates
the gap evidence from the deep-eval. Signal CONFIRMS the gap assumption made in that eval.
When Proposal #4 auto-proceeds 2026-06-13, D6 build proceeds with high confidence in the gap.

---

## 2026-06-06 — D5 VS Code OpenAPI Breaking-Change Lens: gap CONFIRMED + nearest competitor archived

**Source:** VS Code Marketplace research sweep (plan-included sub-agent, 2026-06-06).
Primary sources: oasdiff.com, GitHub (oasdiff, pb33f/openapi-changes, vscode-spectral,
42Crunch), Microsoft Learn (Azure API Center), ApiNotes 2026.

**Signal — complete competitive landscape:**

| Extension | Breaking-change inline diagnostics? | On-device? | Notes |
|---|---|---|---|
| **OpenAPI (Swagger) Editor** (42Crunch, ~2M downloads) | No — security linting, not backward-compat diff | Linting yes; security audit requires cloud | Best-in-class security linter; wrong problem |
| **Spectral** (stoplight) | No — structural linting only, no two-version diff | Yes | Rule-based linter of one spec; cannot do diff |
| **Swagger Viewer** (Arjun) | No — preview/render only | Yes | — |
| **openapi-lint** (Mermade) | No — validator only; **last commit Feb 2020** | Yes | Abandoned |
| **Redocly OpenAPI** | No — validation + preview | Yes | — |
| **Azure API Center** (Microsoft) | **Partial** — Command Palette invoked, powered by Optic | Requires Azure subscription | See below |

**Critical finding — Optic archived January 2026:** The ONLY VS Code extension that detected
breaking changes inline was Azure API Center, which used the open-source tool Optic as its
engine. **Optic was archived in January 2026** (unmaintained). The Azure API Center breaking-
change feature now runs on abandoned technology. APInotes positioned itself as a replacement
but has no VS Code extension. **The one partial competitor just got weaker.**

**Best CLI tools with no VS Code wrapper:**
- **oasdiff** (1.2k GitHub stars, Go, last release June 6 2026 v1.18.4 — actively maintained,
  450+ breaking-change rules)
- **pb33f/openapi-changes** (350 stars, Go, May 2026 v0.2.7, "100% offline, no network
  dependencies")

Neither has a VS Code extension. Our pure TypeScript engine is the right design for a VS Code
extension: no Go runtime required, bundles as pure JS, activates instantly.

**Gap confirmed:** No VS Code extension provides:
- Automatic watch-as-you-type inline squiggles for breaking changes
- Two-version comparison (current vs committed/baseline)
- 100% on-device with no cloud subscription
- Actively maintained (Optic-based Azure extension is now effectively abandoned)

**Implication for Kendama:** D5 gap is STRONGER than the deep-eval assumed. The deep-eval
scored Defensibility at 4/10 citing "Azure API Center" as partial competition — with Optic's
January 2026 archival, that partial competitor is weakening. The revised defensibility picture
is closer to 5-6/10 (the incumbent is unmaintained; the best CLI tools have no VS Code wrapper).
D5 score 636/1000 was conservative; the actual gap may support higher defensibility.

**Action:** D5 deep-eval score is NOT retroactively adjusted (scores are locked at evaluation
date per `governance/SCORING_MODEL.md`), but the signal is logged here as a positive factor for
the build decision. When D5 Phase 1 ships, the Marketplace listing can reference "the gap left
by Optic's archival" as context for first-mover positioning.

**Also notable:** No new VS Code extension specifically for inline breaking-change detection
was found in the March–June 2026 window. The field is static while our product is moving.



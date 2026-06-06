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

## 2026-06-06 — D5 VS Code OpenAPI Breaking-Change Lens: gap sweep (results pending)

**Source:** VS Code Marketplace research sweep (plan-included sub-agent, 2026-06-06). Results
incorporated when sweep completes; placeholder below.

_[OpenAPI lens gap analysis to be filled in — see STATE.md for update status]_


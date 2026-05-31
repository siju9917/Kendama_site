# Deep evaluation (scaffold) — `terraform plan` destructive-change classifier (D6)

First-principles sections are filled now (cap-independent); cited
competitor/revenue sections are marked `[CITED — cap-gated]`. Added
2026-05-30 evening (first-principles ideation, 5b/5.7.6). Candidate D6 in
`brain/IDEA_BACKLOG.md`.

## The product in one line

A VS Code extension (+ optional CI-free CLI) that reads a `terraform plan`
(or `terraform show -json` plan output) and classifies each proposed change
by **blast radius**: CRITICAL (resource *replacement*/destroy, data-store
deletion, security-group/IAM widening) vs NORMAL (in-place attribute tweak).
It *reports* the dangerous lines — it does not gate or auto-apply. Same
horizontal capability as BidDiff: diff two states → classify criticality →
report, never advise. New rule-pack (plan-JSON anchors + a destructive-action
ruleset); the engine + the "report-don't-advise" discipline are reused.

## The decisive dynamic: an acute, universal pain + an on-device wedge

Every `terraform apply` is a held breath — the operator scans `~`/`-/+`/`-`
lines for the one that will *replace* the prod database or widen a security
group. The pain is universal among platform/DevOps engineers and acute
(under change-window pressure). The wedge over the incumbents (Spacelift,
env0, Terraform Cloud run-tasks/policies) is a **free/cheap, on-device,
IDE-native "what in this plan is dangerous?"** with zero CI/cloud setup and
zero plan-data exfiltration — infra plans are sensitive (they contain
resource names, IPs, sometimes secrets-shaped attributes), so staying local
clears the security review that a hosted plan-analysis SaaS must pass. This
is the on-device-trust wedge (`IDEA_BACKLOG`) applied to a non-federal,
high-TAM developer market.

## 1. Competitor teardown — `[CITED — cap-gated]`

To research when the cap is set: Spacelift / env0 / Terraform Cloud
run-tasks + Sentinel/OPA policy pricing and positioning; `tfsec`/`checkov`
(static security scanners — adjacent but not plan-blast-radius); `infracost`
(cost diff — proves the "annotate a plan in the IDE/PR" UX is adopted and
monetizes); any existing VS Code terraform-plan visualizers and their
install counts. Key question: does anyone already do *free, on-device,
IDE-native destructive-change classification* specifically? (Hypothesis: the
incumbents are CI/cloud-gated policy engines, not a local IDE lens.)

## 2. Revenue model — `[CITED — cap-gated]`

Generous free tier (the classifier itself) + paid team features (shared
rule-packs, org policy presets, multi-workspace). VS Code has no built-in
billing → DIY license server (same as D5). Benchmark MRR against infracost /
paid terraform VS Code extensions when cap-unblocked.

## 3. Distribution — first principles

VS Code Marketplace — the largest dev marketplace; "terraform" is a
top-searched tag (HashiCorp's own extension has millions of installs, proving
the audience lives there). Distribution-without-marketing: marketplace search
+ the HashiCorp-adjacent tag. Strong (9/10).

## 4. Build-effort — first principles

The input is well-specified: `terraform show -json <planfile>` emits a
**stable, documented** JSON schema (`resource_changes[].change.actions` =
`["create"]`/`["delete"]`/`["delete","create"]` (= replace)/`["update"]`,
plus `before`/`after`/`after_unknown`). So classification is largely:
map `actions` + resource-type + which attributes changed → criticality. The
destructive set (replace/destroy, and provider-specific privilege-widening
like `aws_security_group` ingress `0.0.0.0/0`, IAM policy broadening) is the
rule-pack — the per-product work, mirroring BidDiff's `critical.ts`. Parsing
raw `terraform plan` text (no -json) is a fallback, messier; lead with the
-json path. Build feasibility: 7/10 (well-bounded; the rule-pack breadth is
the effort, and it grows incrementally — ship the obvious destructive cases
first).

## 5. Risk register — first principles

- **Rule-pack breadth.** "Destructive" is provider- and resource-specific;
  v1 must cover the high-value obvious cases (replace/destroy, SG/IAM
  widening) and be honest about coverage (report what it knows, never imply
  completeness — the "reports, never advises" discipline maps directly).
- **HashiCorp could ship it natively.** Mitigation: IDE-native immediacy +
  on-device + the curated destructive-rule-pack as the moat; same
  "compete on the wedge, not parity" stance as D3/D5.
- **Plan-JSON schema drift across Terraform versions.** Lower risk than
  Shopify's API churn — the plan-JSON `format_version` is versioned and
  stable; pin + test against the documented versions.

## 6. Why this might fail (mandatory) — first principles

- If the incumbents' CI/policy gating is "good enough" for the buyers who
  pay, a *read-only IDE lens* may be seen as nice-to-have, not buy-worthy
  (the same monetization risk as any IDE linter). The cited teardown must
  check whether anyone monetizes a *local* plan lens, or whether value
  accrues only to the CI/cloud policy layer.
- VS Code's no-billing means more build (DIY license server) before a dollar.

## 7. Evidence tier — provisional **Proven-leaning**

The pain is Proven (universal apply-dread; infracost/policy-engine spend
proves willingness to pay around terraform plans); the *specific* "free
on-device IDE classifier" wedge is the unproven bet. Cited teardown confirms
or downgrades.

## Provisional scoring (first principles; cap-independent factors only)

Per `governance/SCORING_MODEL.md`, the 6 structural factors (the cited
revenue/probability/evidence await the cap): Dist 9, Maint 9 (on-device, no
hosting), Build 7, Self-serve 5 (VS Code DIY billing), Defensibility 6
(incumbents exist; none free+on-device+IDE-native; rule-pack moat),
Strategic 8 → **partial 438/580** (arithmetic-verified), in the D3 (448)/MCP
(436) band, behind rank-1 (460)/D2 (474). Belongs near D2/D5 in the
deep-eval order, ahead of the server-side D4. Not approved; awaits the cited
deep-eval + `human/APPROVALS.md`.

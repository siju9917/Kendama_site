# Deep evaluation (scaffold) — `clauseguard` GitHub Marketplace app

**Status:** **scaffold.** First-principles sections filled; cited
sections `[CITED — cap-gated]`. `IDEA_BACKLOG` candidate **D2**; ranked
**#2** in the recommended deep-eval order (`brain/RANKING.md`). Not
decision-ready until the cited sections land.

**Idea:** A GitHub Marketplace **App** (webhooks, NOT Actions — permitted
by `governance/GUARDRAILS.md` #1's read-only carve-out) that flags
**stale or changed regulatory-clause references** in a repo's code,
docs, and config. When a PR or repo cites a FAR/DFARS/HIPAA/PCI/SOC2
control, it surfaces the current canonical text and whether that
reference changed since the codebase last pinned it. Reuses BidDiff's
curated clause dataset + critical-change engine (validated horizontal —
see `engine-domain-agnostic.test.ts`).

## Guardrail clearance (first principles — check up front)
- ✅ **Not GitHub Actions.** A GitHub *App* uses webhooks + the REST/
  GraphQL API + the Checks API. It does not create/trigger/modify any
  workflow. GUARDRAILS #1 prohibits *Actions*, and explicitly carves
  out reading the GitHub surface; IDEA_BACKLOG standing category #4
  affirms paid GitHub apps that don't *use* Actions are permitted.
- ✅ Self-serve monetization via GitHub Marketplace billing (per-seat /
  per-org); no invoicing.
- ⚠️ Build feasibility: needs a hosted webhook receiver (a small
  always-on service) — worse maintenance-fit than BidDiff's on-device
  model, but standard and cheap.

## 1. Competitor teardown — `[CITED — cap-gated]`
Must cover: compliance-as-code tools (OPA/Conftest, Bridgecrew/Checkov,
Semgrep with compliance rule-packs), license/dependency-policy bots,
and any existing "regulatory reference" GitHub apps. The honest wedge:
those check *policy/config*, not *the currency of a cited regulatory
clause's text*. The teardown must confirm that gap is real and unowned.

## 2. Revenue model — `[CITED — cap-gated]`
GitHub Marketplace per-seat/org subscription, free tier for public
repos. Comparable: established Marketplace apps' disclosed pricing/
install counts (cite). The clause dataset (currency + plain-language +
critical classification) is the paid moat over raw "link to eCFR."

## 3. Distribution — first principles
**GitHub Marketplace** = genuine buy-intent traffic from compliance-
conscious orgs browsing/​searching for compliance tooling. This is the
candidate's biggest strength (vs. the npm-SEO-only derivatives). Plus
the in-PR check surface is itself distribution (every flagged PR shows
the product to reviewers).

## 4. Build-effort — first principles
- **Phase 1:** GitHub App scaffold (Probot or raw): install flow,
  webhook receiver (`pull_request`, `push`), Checks API output.
- **Phase 2:** A reference scanner — detect regulatory citations in
  diffs/files (regex + the BidDiff anchor detectors generalize:
  CLAUSE_REF already matches FAR/DFARS; add HIPAA/PCI/SOC2 control
  patterns as new anchor types / a rule-pack).
- **Phase 3:** Clause-currency lookup + change detection (reuse the
  BidDiff clause dataset + the diff engine on clause text).
- **Phase 4:** Marketplace listing + billing + a hosted deploy.
- **Maintenance:** an always-on receiver + the dataset refresh (shared
  with the rank-2 MCP server — they want the same ingest pipeline).

## 5. Risk register — first principles
- **Hosted-service dependency** (webhook receiver uptime) — the main
  maintenance-fit drag.
- **Dataset breadth** — FAR/DFARS is curated (BidDiff); HIPAA/PCI/SOC2
  expand scope and need their own validated sources.
- **"Is this a real pain?"** — orgs may not cite regulatory clauses in
  repos densely enough to need a bot. The cited section must size this.
- **GitHub platform risk** (Marketplace terms, app review).

## 6. Why this might fail (mandatory) — first principles
- **The pain may be too thin:** if regulatory-clause references in
  code/docs are rare, there's nothing to flag and no buyer. This is the
  decisive unknown the cited eval must size; if thin, the idea drops.
- **Scope creep across frameworks** (FAR vs HIPAA vs PCI) could
  outrun the curated-dataset moat — better to launch narrow (FAR/DFARS,
  reusing BidDiff's dataset) and expand only with validated sources.
- **Maintenance-fit** (always-on service) is a real cost the
  autonomous-solo model dislikes.

## 7. Evidence tier — provisional **Plausible**
Strong distribution + clear guardrail clearance + direct engine/dataset
reuse; the open question is pain density (cited). Could be Proven-leaning
if the teardown finds comparable compliance-bot revenue.

## Provisional scoring (first principles)
| Factor | Wt | Prov. | Note |
|---|--:|--:|---|
| Revenue ceiling | 18 | tbd | per-seat compliance tooling; §2 |
| Prob. of ceiling | 14 | tbd | pain density unknown (§6) |
| Distribution quality | 14 | **8** | GitHub Marketplace buy-intent + in-PR surface |
| Maintenance fit | 10 | 5 | always-on receiver + dataset refresh |
| Build feasibility | 10 | 7 | GitHub App standard; anchors/dataset reuse |
| Self-serve monetization | 8 | **8** | Marketplace billing |
| Defensibility | 8 | 7 | curated clause dataset + currency-diff moat |
| Evidence quality | 10 | tbd | §1/§2 |
| Strategic fit | 8 | **9** | reuses dataset + engine; shares ingest w/ rank-2 |

**Read:** the **strongest derivative on distribution + guardrail-fit +
strategic reuse**; the single biggest unknown is *pain density* (do orgs
cite regulatory clauses in repos enough?). Launch narrow (FAR/DFARS,
reusing BidDiff's dataset) if pursued. Deep-eval second, after rank-1.

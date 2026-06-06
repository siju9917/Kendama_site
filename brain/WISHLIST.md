# WISHLIST.md — infrastructure I wished existed while building

> Every time the factory hits friction ("this would be easier if X
> existed", "I had to pay for Y and it was bad", "no good tool for
> Z", "this API is fragmented and painful"), X / Y / Z is logged
> here with the context of how the need arose.
>
> WISHLIST items feed `brain/IDEA_BACKLOG.md`. These are the ideas
> that are NOT on any online listicle — the founder-style
> "scratch your own itch" ideation.

Format per item:

```
## YYYY-MM-DD — <short title>

**Friction encountered:** what was annoying.
**Where it came up:** product / experiment / loop.
**Proposed product:** what would solve it.
**Initial size estimate:** how big this might be (scope and
buyer audience).
**Promoted to backlog?** date and rank if yes.
```

---

## 2026-05-27 — A clean, fast PDF text extractor with layout intent

**Friction encountered:** BidDiff's PDF extraction work spent
substantial effort working around PDF.js quirks: line-break
joining, hyphenation rejoining, ligature normalization, soft
hyphens, zero-width characters, control-character leakage,
column reconstruction. Every Chrome MV3 extension that diffs,
indexes, or summarizes PDFs in-browser hits the same wall.

**Where it came up:** BidDiff codebase
(`products/biddiff/src/core/extract/pdf/`) — many fixes during
the prior critique loop addressed individual PDF extraction
edge cases (control chars, zero-width chars, ligatures, soft
hyphens, hyphen-broken line wraps).

**Proposed product:** A WASM-packaged "extract PDF text the way
a human would read it" library, designed specifically for
Chrome MV3 service-worker and offscreen-document contexts —
ligature normalization, hyphenation joining, layout-aware
column detection, page-rotation handling, encrypted-PDF
detection, all built in. Drop-in dependency for anyone doing
in-browser PDF text work.

**Initial size estimate:** Small-to-medium technical scope;
audience is every web-context PDF tool. Distribution via npm
+ JSR. Monetization: generous free tier + paid commercial
license dual model.

**Promoted to backlog?** Not yet. Deep-evaluated on the next
research cycle and ranked against existing candidates in
`brain/IDEA_BACKLOG.md`.

---

## 2026-05-27 — Federal solicitation amendment monitoring as a feed

**Friction encountered:** BidDiff diffs two amendments the user
already has. The implicit unmet need is **noticing** a new
amendment was posted — currently a manual SAM.gov check per
opportunity. Capture teams want push, not poll.

**Where it came up:** Implicit in the BidDiff Domain-Expert
finding (`products/biddiff/CRITIQUE_LOG.md` K1 pass 1) — the
first thing a capture manager scans for is *what changed* in
the amendment, but only after they know the amendment exists.

**Proposed product:** An RSS / email / Slack / webhook feed of
SAM.gov amendments matched to saved opportunity searches, with
the critical-change summary inline (using the same engine that
backs BidDiff). Distribution: paid SaaS with a clear free tier;
high alignment with capture-team workflow.

**Initial size estimate:** Medium build; depends on a stable
SAM.gov data path (the SAM.gov Beta API, GovTribe, etc. — to
be researched). The product compounds with BidDiff: same diff
engine, same clause dataset, same critical-rules ruleset.

**Promoted to backlog?** Not yet. Logged for the next research
cycle.

---

## 2026-05-27 — A critical-change rules curation tool for regulated industries

**Friction encountered:** BidDiff's critical-rules ruleset is
hand-coded in TypeScript. Updating it for a new regulatory
shift (e.g., a new compliance certification, a new FAR clause
class) requires editing code and shipping a new extension
version. Every regulated-document-diff product hits this — and
the people who know what's critical aren't the people who write
TypeScript.

**Where it came up:** BidDiff K1 Domain-Expert finding — the
ruleset will keep needing additions; the engineering cost of
each addition discourages frequent updates.

**Proposed product:** A web tool (or library) that lets a
domain expert define critical-change rules in a structured DSL
— pattern-match on extracted blocks, anchor types, clause
references, value ranges — and exports a ruleset any diff
product can consume at runtime. Audience: any vertical that
diffs regulated documents (federal procurement, FDA filings,
securities filings, building codes).

**Initial size estimate:** Medium; speculative evidence tier.
Distribution unclear — possibly open-source rules library +
paid SaaS for managed rule sets.

**Promoted to backlog?** Not yet. Logged for the next research
cycle.

---

## 2026-05-30 — A jsdom-compatible WCAG contrast checker for component tests

**Friction encountered:** BidDiff's Accessibility K1 P2 (verify
dark-mode contrast on *rendered* components, not just design tokens
in isolation) is **browser-gated** — and the reason is concrete:
`axe-core` / `jest-axe`, the standard a11y test tools, **cannot
evaluate the color-contrast rule under jsdom**, because jsdom does no
layout or computed-color resolution. So a fast, CI-friendly,
no-real-browser way to assert "this rendered component meets WCAG
2.1 AA contrast in light and dark mode" simply does not exist; teams
either spin up Playwright/Chromium (slow, heavy) or skip rendered
contrast entirely (what most do).

**Where it came up:** This session, deciding how to close BidDiff's
a11y contrast P2 without a browser. Concluded adding `jest-axe`
would be *theater* for contrast (it silently no-ops that rule in
jsdom), so the P2 stays correctly browser-gated.

**Proposed product:** A library that, given a rendered component tree
(jsdom) + its stylesheet(s), resolves effective foreground/background
colors by walking the cascade itself (parse the CSS, compute
specificity, resolve CSS variables and `currentColor`, handle alpha
compositing) and asserts WCAG contrast ratios — no real browser, no
layout engine needed for the *color* question. Ship as a Vitest/Jest
matcher (`expect(el).toMeetContrast('AA')`) + a standalone checker.
Distribution: npm/JSR (dev-tooling SEO: "jsdom contrast", "wcag
contrast test", "jest-axe contrast"). The wedge over axe-core is
exactly the gap axe documents it can't fill.

**Initial size estimate:** Medium technical scope (a focused CSS
cascade + color resolver; the WCAG contrast math is trivial). Audience
is every front-end team with component tests + a dark mode. Evidence:
Plausible. Strategic fit: this is also what BidDiff itself needs to
close its own a11y P2 without Chromium — dogfood-able.

**Promoted to backlog?** Not yet — candidate for the
derivative/dev-tooling set when the cap unblocks deep-evaluation.
Cross-referenced from `products/biddiff/PROGRESS.md` (the a11y P2).

---

## 2026-05-30 — A "claim → red test → fix" verification harness for autonomous coding agents

**Friction encountered:** During a long unattended session this factory
*hallucinated* a bug in already-correct code (a "nondeterministic content
hash" that was pure), "fixed" it, broke the build, and committed confident-
but-false brain entries before a full-suite run caught the contradiction. The
root cause was acting on a believed defect with no failing test demonstrating
it *first*. The countermeasure that actually works is procedural: a bug claim
must be backed by a red test that exists BEFORE the fix, and every change must
pass typecheck+lint+test (not just a green run of one file) before commit.

**Where it came up:** This session's own operation — the most expensive lapse
of the day, now encoded as rules (CLAUDE.md verify-before-commit; the
PLAYBOOK "Engineering discipline" section) but enforced only by discipline.

**Proposed product / tool:** A thin harness/CLI for autonomous coding agents
that makes the discipline mechanical: given a claimed bug, it scaffolds a
failing-test-first workflow (refuses to accept a "fix" commit unless a test
that was RED at the parent commit is GREEN at the fix commit), and gates any
commit on the full `typecheck+lint+test` triple, not a partial run. Think
"TDD-guard for agents." Distribution: npm + a Claude Code hook template; the
buyer is anyone running long-horizon autonomous coding (a fast-growing niche).
The on-device-trust wedge applies — it runs locally, touches only the repo.

**Initial size estimate:** Small-to-medium. The hard part is the
git-diff-aware test-state comparison (was this test red before?), which is
mechanical. Evidence: Plausible (the agentic-coding tooling market is new but
real). Strategic fit: medium — it's adjacent to the factory's own needs
(dogfoodable) rather than to BidDiff's diff engine.

**Promoted to backlog?** Not yet — logged as a cap-gated deep-eval candidate
and, more immediately, as a *factory-internal* capability worth prototyping
(it would have prevented this session's worst lapse). The
`brain/SELF_IMPROVEMENT.md` count-drift check (#8) is a smaller sibling.

---

## 2026-06-06 — A structured, machine-parseable deep-evaluation format

**Friction encountered:** The SCORING_MODEL (`brain/SCORING_MODEL.md`) produces
a score from 9 factors × 0–10, but the deep evaluation files (e.g.,
`brain/RESEARCH/2026-06-06-vscode-breaking-change-lens.md`) are unstructured
prose. Reading a completed eval requires scanning many paragraphs to extract
the factor scores; there is no way to grep, diff, or automatically check that
every factor was addressed. When a second eval is done months later, calibration
drift (same product scores differently because the prose framing shifted) is
invisible.

**Where it came up:** This session — running two product deep evaluations back-
to-back (clauseguard + VS Code lens), then summarizing both to RANKING.md. The
summaries are the only thing I can actually compare; the underlying reasoning is
prose locked behind 1000+ lines.

**Proposed tool/format:** A YAML or JSON front-matter block at the top of every
deep-eval file that machine-encodes the final score:

```yaml
---
product: VS Code OpenAPI Breaking-Change Lens
date: 2026-06-06
evidence_tier: Plausible
total_score: 636
scores:
  revenue_ceiling: {weight: 18, score: 5, weighted: 90}
  probability: {weight: 14, score: 4, weighted: 56}
  # ...
recommendation: PROCEED
---
```

The factory's `ops/checks/` could then include a `ranking-integrity` check
that (a) parses the front-matter from all research files, (b) re-derives the
weighted totals, (c) checks that RANKING.md's score for each product matches
the front-matter, and (d) flags any factor in the scoring model that appears
in fewer than 50% of evaluations (a sign a factor is routinely skipped).

**Initial size estimate:** Small. The front-matter format is a one-time schema;
the check is ~50 lines. The backward-compat path is "add front-matter on first
re-edit" rather than "retrofit all existing files immediately."

**Promoted to backlog?** Not yet — logged for the next factory self-improvement
cycle. It eliminates the current manual/fuzzy calibration problem for all future
evaluations, at near-zero cost.

---

## 2026-06-06 — Critical-change diff for infrastructure-as-code (D7+ ideation)

**Friction encountered:** The D-family currently tops out at D6 (Terraform VS Code
classifier). The horizontal capability thesis ("critical-change diff as a platform")
has additional adjacent verticals that were NOT evaluated this cycle — logged by
the Ambition Critic as an ideation gap.

**Where it came up:** Adversarial critique pass 3, Ambition Critic finding.

**Proposed ideas (D7+):**
- **D7: Kubernetes YAML diff classifier** — detects critical changes in K8s
  manifests (replicas=0, securityContext privilege escalation, RBAC permission
  widening, secret/configmap changes, image tag changes to "latest"). DevOps
  audience; incumbent tools (kubeval, Datree, Polaris) focus on validation, not
  diff classification. On-device. TypeScript + YAML parser.
- **D8: CloudFormation / CDK diff classifier** — AWS-specific; detects resource
  replacements, IAM policy widening, data-store deletion in IaC plans. Similar
  wedge to D6 (Terraform) but AWS-native audience. The CF change-set JSON is
  the input (structured, not prose). `aws cloudformation deploy --no-execute-changeset`
  produces the input. High-value CI/CD integration.
- **D9: Docker image layer diff** — detects dependency version changes, removed
  packages, new root-level files, privilege changes (USER root), exposed port
  additions between two image build outputs. Audience: security-conscious DevOps.

**Initial size estimate:** Each is medium scope. D7 (K8s) and D8 (CloudFormation)
share the most with D6 (IaC focus); D9 (Docker) is most orthogonal.

**Promoted to backlog?** First-principles format-pack scoring done (2026-06-06)
— added to `brain/IDEA_BACKLOG.md` "BCL format-pack roadmap candidates" section
(per meta-synthesis: not D7/D8/D9 as separate products; instead format-packs for
the Breaking-Change Lens product line). SQL migration (STRONG), K8s YAML (STRONG),
GraphQL (MEDIUM), CloudFormation (MEDIUM), Avro (LOW-MEDIUM), Docker image diff
(DROPPED — binary layer analysis doesn't fit the BCL model). Cap-gated cited
deep-eval still pending for top format-packs.

---

## 2026-06-06 — Multi-label change classification in BidDiff

**Friction encountered:** The `classify` function uses a first-match rule
across categories — a CLAUSE_REF anchor inside Section M (EVALUATION_CRITERIA)
gets classified as CLAUSES (rule 1 fires first), losing the "evaluation criteria
changed" label. A proposal manager scanning for evaluation-criteria changes would
miss this one unless they notice it's in Section M. The severity is still CRITICAL
(clause rules fire on any CLAUSES + INSERT/DELETE/MODIFY), but the category label
carries information a practitioner needs.

**Where it came up:** Adversarial Pass 4 (2026-06-06), reviewing the classify-
precedence pin test. Explicitly accepted as a V1 trade-off — the first-match rule
simplifies classification and the severity is correct — but logged here so V2
design considers multi-label output.

**Proposed feature (for BidDiff V2 or a configurable option):** Allow a change
to carry multiple categories when anchors from different category classes
co-occur (CLAUSE_REF + EVALUATION_CRITERIA anchor, or DEADLINE + SUBMISSION_INSTRUCTIONS).
Output both labels in the ChangeCard, and fire all category-specific critical rules
across both labels. This requires a small refactor: `classifyItem` returns
`string[]` of categories instead of a single `string`; `evaluateCriticality`
applies rules against ANY matching category.

**Initial size estimate:** Small-medium refactor within the engine (touch
`classify.ts`, `critical.ts`, and the `ChangeItem` type). Risk: the test
surface is large; every classify/critical test must handle array output.
The pin test that documents the current V1 behavior becomes the migration
regression test.

**Promoted to backlog?** Not yet. Log as V2 BidDiff POLISH. Evaluate when
a practitioner validates that the category signal materially affects their
workflow (vs. "section M = CRITICAL anyway, I don't need the label").

---

## 2026-06-06 — Factory check "drift-between-session" validator

**Friction encountered:** This session manually updated STATE.md item counts
(455→484→486→488→490 tests) across many commits, and the count drifted stale
between commits. The existing `state-count-sanity` check validates the final
count headline but doesn't validate that mid-session commits haven't left the
count stale for a long time.

Also, during the session, the META_LESSONS 5.7.7 audit was written when tests
were at 486; by session end they were at 490. The audit document was accurate
at the time of writing but stale when the session ended. There's no mechanism
to flag "this document was last updated at state X, and state has since advanced."

**Where it came up:** Writing the session continuation and realizing META_LESSONS
covered items 1-15 but the session actually reached item 19 by end.

**Proposed tool:** A "temporal consistency" check — given a set of brain files
that assert a count/status (STATE.md, META_LESSONS.md), validate that the
highest-stated count doesn't lag the actual repo state by more than a fixed
threshold. Could be as simple as: parse `STATE.md`'s test-count headline,
compare to `META_LESSONS.md`'s most-recent session audit's stated count — if
they diverge by >10, flag as P2 "brain drift." 

**Initial size estimate:** Small. Build as another `ops/checks/` module.
Caveat: must not run the vitest suite (per the existing state-count-sanity
design note). Instead, read both files and compare the stated test counts
using the same parser as `state-count-sanity.mjs`.

**Promoted to backlog?** Not yet — candidate for SELF_IMPROVEMENT backlog;
the state-count-sanity check (#8) is a sibling.

---

## 2026-06-06 — OpenAPI allOf/oneOf/anyOf schema composition merger

**Friction encountered:** During openapi-lens D5 Phase 0, schemas using
`allOf`, `oneOf`, or `anyOf` composition are stored as-is and their member
schemas are NOT merged before diffing. A breaking change inside a composed
schema is invisible to the current engine. Every real-world OpenAPI spec uses
composition heavily (inheritance patterns, discriminated unions, nullable via
`oneOf: [{...}, {type: "null"}]`).

**Where it came up:** openapi-lens Phase 0 Known Limitations section — flagged
as Phase 2 work. Found during initial engine design.

**Proposed feature (openapi-lens Phase 2 or as a standalone library):** A
pre-processing step that flattens `allOf`/`oneOf`/`anyOf` schemas before
diffing: merge `allOf` members into a single flat schema (taking the union of
`required[]` and `properties`), flag `oneOf`/`anyOf` members as requiring
per-variant comparison. If extracted into a library, useful to any API tooling
(linters, generators, mock servers) that needs a flat view of a composed schema.

**Initial size estimate:** Medium. The `allOf` flattening case is well-defined
(merge required + properties, error on conflicting types). The `oneOf`/`anyOf`
case requires per-variant analysis, which is genuinely complex (n² comparisons).
Ship `allOf` first; leave `oneOf`/`anyOf` for a follow-up.

**Promoted to backlog?** **Partially resolved in Phase 0 (2026-06-06):** `allOf`
flattening was implemented in Phase 0 (`flattenAllOf()` in `parser.ts`, merging
`required[]` + `properties` + scalar fields including constraint fields). `oneOf`
and `anyOf` remain Phase 2 — members are stored but not merged; breaking changes
inside composed variants are invisible. Remaining work tracked in
`products/openapi-lens/PROGRESS.md` Phase 2 known limitations.

---

## 2026-06-06 — Recursive property-level diff beyond 1 level

**Friction encountered:** openapi-lens Phase 0 added one-level-deep property
diffing (`properties.fieldName.type`). Nested objects (e.g., a `user` object
with a `address` object with a `zipCode` field) are only compared at the
`user.type` level. A type change in `user.address.zipCode` from `number` to
`string` is currently invisible.

**Where it came up:** openapi-lens Phase 0 Known Limitations — flagged explicitly
as a limitation during Phase 0 engine design.

**Proposed feature:** A recursive schema walker that diffs the full `properties`
tree to arbitrary depth, with a configurable max-depth to prevent infinite loops
on circular schemas (which would need cycle detection via a visited-set). Output
would be paths like `responses[200].content.schema.properties.user.properties.address.properties.zipCode.type`.

**Initial size estimate:** Small-to-medium within openapi-lens. The key
complexity is circular reference detection (a schema property that $refs back to
a parent type — common with tree/linked-list schemas). With a `seen: Set<object>`
guard, the recursion is straightforward.

**Promoted to backlog?** **Resolved in Phase 0 (2026-06-06):** `diffSchemaProperties()`
now recurses to `MAX_PROPERTY_DEPTH = 5` levels using a `depth` parameter. Cycle-safe
(stops at 5, no crash). Full dotted path in `location` (e.g., `properties.user.properties.address.properties.zipCode`). 5 new tests. The original WISHLIST concern
is closed; the known limitation is now only at depth > 5 (rare in real specs).

---

## 2026-06-06 — TypeScript union-exhaustiveness enforcement rule for handler registries

**Friction encountered:** When a discriminated union type (`OapiChangeType`) maps to a
handler system (classify rules), new values added to the union silently fall through to
a wrong default (INFO) with no diagnostic. The fix (a `Record<UnionType,...>` completeness
guard in a test file) had to be written manually and is fragile — it works only because
TypeScript raises a compile error when a key is missing from a `Record` literal.

**Where it came up:** openapi-lens classify.ts — 5.7.2 third adversarial pass found
that new OapiChangeType values were silently rated INFO if a classify rule was omitted.

**Proposed tool:** An ESLint / TypeScript plugin rule: `no-unhandled-union-member`.
Given a switch statement or a const map keyed by a union type, the rule verifies that
every member of the union has a handler and flags missing cases. Similar to TypeScript's
`noImplicitReturns` but enforced at the lint level for dictionary/map patterns, not just
switch statements. Useful to any codebase with a command dispatcher, event bus, or rule
engine backed by a TypeScript union.

**Initial size estimate:** Small. The AST analysis is narrow: find `Record<SomeUnion,...>`
or `{[K in SomeUnion]: ...}` type-annotated consts, check that every member of the union
appears as a literal key. This is already what TypeScript checks — the lint rule makes it
visible at authoring time with a clearer diagnostic message.

**Promoted to backlog?** Not yet. Log as a potential small open-source dev-tooling product.

---

## 2026-06-06 — Schema field "parsed vs diffed" matrix as a product-level artifact

**Friction encountered:** During the openapi-lens 5.7.5 bug-hunt, the "parsed-but-never-
diffed" audit was done entirely by hand: enumerate every field in OapiSchema, then check
each diff function (diffSchemaType, diffSchemaProperties, diffSchemaItems) to see if it
compares the field. This took multiple passes and still missed gaps (items.enum,
items.nullable, properties.nullable, readOnly, writeOnly, parameter.deprecated) on the
first pass.

**Where it came up:** openapi-lens Phase 0 — 5+ rounds of "parsed-but-never-diffed" fixes.

**Proposed tool:** A code-generation or analysis script that, given an interface definition
(`OapiSchema`) and a set of diff functions, produces a matrix: "field × diff function →
is compared?". Could be implemented as a TypeScript AST analyzer (parse the diff functions,
find every `.fieldName` access, cross-reference against the interface). Output is a Markdown
table checked into the product as `parsed-vs-diffed-matrix.md` and verified by a factory
check. A missing entry in the matrix = a potential silent gap.

**Initial size estimate:** Small-medium. The AST parsing is well-trodden (ts-morph or the
TypeScript compiler API). The main complexity is handling nullable fields (`?? false`)
vs direct comparisons — they're semantically equivalent but syntactically different.

**Promoted to backlog?** Not yet. Useful as a factory self-improvement tool for any
schema-parsing product. Could also become a standalone dev-tooling library.

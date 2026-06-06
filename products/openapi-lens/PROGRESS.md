# PROGRESS.md — VS Code OpenAPI Breaking-Change Lens (D5)

> Status: **Phase 0 — engine complete, not yet a VS Code extension.**
> Human gates pending before ship: VS Code Marketplace publisher registration
> (free personal account; $100 org account requires approval).
> See `human/NEED_FROM_HUMAN.md` item pending.

---

## Phase 0 — core engine (DONE 2026-06-06)

Zero-cost, zero-VS-Code-dependency TypeScript engine. Ships when the proposal
auto-proceeds (2026-06-13) or earlier if human approves.

### Completed

- [x] **Project scaffold**: `package.json`, `tsconfig.json`, `vite.config.ts`
  (Vitest 4, TypeScript strict, ESNext modules)
- [x] **`src/engine/types.ts`**: Full type system — `OapiSpec`, `OapiOperation`,
  `OapiParameter`, `OapiRequestBody`, `OapiResponse`, `OapiSchema`,
  `OapiRawChange`, `BreakingChange`, `Severity`, `OapiChangeType` (18 types)
- [x] **`src/engine/parser.ts`**: YAML/JSON OpenAPI parser
  — auto-detects format, handles OAS 3.0/3.1 + Swagger 2.0,
  resolves `#/components/schemas/$ref` inline, merges path-level
  + operation-level parameters, extracts request bodies + responses
- [x] **`src/engine/diff.ts`**: Structural diff between two parsed specs
  — detects: endpoint added/removed, parameter added/removed/required-changed/
  type-changed/format-changed/enum-changed, requestBody required-changed,
  request schema required fields, response status codes added/removed,
  response schema required fields + type changes + nullable changes
- [x] **`src/engine/classify.ts`**: Breaking-change rule pack
  — 20 rules mapping `OapiRawChange` → `BreakingChange` with severity
  (BREAKING / INFO) and a human-readable `message`
- [x] **`src/engine/index.ts`**: Public API — `analyzeOpenApiDiff()`,
  `breakingOnly()`, all type exports
- [x] **91/91 tests** — parser (17), diff (20), classify (22), integration (9),
  adversarial (15), property-diff (8)
- [x] Typecheck clean

### Breaking-change rules implemented (Phase 0)

| Rule | Severity |
|---|---|
| Endpoint removed | BREAKING |
| Required parameter added | BREAKING |
| Parameter removed | BREAKING |
| Parameter required: false→true | BREAKING |
| Parameter type changed | BREAKING |
| Parameter format changed | BREAKING |
| Enum values removed from parameter | BREAKING |
| Request body became required | BREAKING |
| Required field added to request body schema | BREAKING |
| Request body schema type changed | BREAKING |
| Response status code removed | BREAKING |
| Required response field removed | BREAKING |
| Response field type changed | BREAKING |
| Response field nullable: true→false | BREAKING |
| Endpoint added | INFO |
| Optional parameter added | INFO |
| Parameter required: true→false | INFO |
| Request schema field required→optional | INFO |
| Response status code added | INFO |
| Response field guaranteed as required | INFO |
| Response field nullable: false→true | INFO |
| Response property type changed | BREAKING |
| Response property removed | BREAKING |
| Request property type changed | BREAKING |
| Request property removed | BREAKING |
| Response property added | INFO |

---

## Phase 1 — VS Code extension scaffold (PLANNED)

_Begins when Proposal #3 auto-proceeds (2026-06-13) or human approves._

- [ ] VS Code extension manifest (`package.json` extensions fields)
- [ ] Activation on YAML/JSON file open (`onLanguage:yaml`)
- [ ] Diagnostic provider (inline squiggles for BREAKING changes)
- [ ] CodeLens provider (summary above `openapi:` declaration)
- [ ] Git HEAD baseline comparison (via VS Code git API)
- [ ] Manual baseline file selection (file picker)

## Phase 2 — Full UI + hardening (PLANNED)

- [ ] WebView panel (full classified change list, reuses BidDiff ChangeCard
  rendering pattern)
- [ ] Full critique panel pass (all 14 critics)
- [ ] Edge cases: `$ref` chains, `allOf`/`oneOf`/`anyOf` resolution,
  circular refs, remote refs (stubbed out)

## Phase 3 — Monetization gate (at 1,000 installs)

- [ ] LemonSqueezy license key validation (same pattern as BidDiff)
- [ ] Free tier (50 analyses/day) vs Pro (unlimited + multi-branch + team)
- [ ] Marketplace listing: animated GIF demo, keywords, categories

## Phase 4 — Terraform pack (PLANNED)

- [ ] `terraform show -json` plan parser
- [ ] Destructive-change classifier (replace/destroy/IAM-widening = CRITICAL)
- [ ] Extension re-labeled "Breaking-Change Lens" with format picker

---

## Open questions / human gates

| ID | What | Why gated |
|---|---|---|
| VS Code pub reg | Publisher registration (personal free / org $100) | Human action + possible $100 approval |
| LemonSqueezy | Account setup (free) | Human one-time action |

---

## Known limitations (Phase 0)

- **No remote `$ref` resolution.** References to external files or URLs are
  not resolved; only `#/components/schemas/X` local refs are supported.
- **No `allOf`/`oneOf`/`anyOf` merging.** Composition schemas are stored
  as-is; their members are not merged into a flat schema for diffing.
- **No deprecated-field propagation.** The `deprecated` flag is parsed but
  not used in classification (no severity downgrade for deprecated operations).
- **No property-level diff inside schemas.** Request/response schema changes
  are compared at the `required[]` array + `type` levels, not recursively
  into nested `properties`. Phase 2 adds recursive property diffing.

# PROGRESS.md — VS Code OpenAPI Breaking-Change Lens (D5)

> Status: **Phase 0 — engine complete + critique-panel cleared. Not yet a VS Code extension.**
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
- [x] **161/161 tests** — parser (21), diff (24), classify (47), integration (10),
  adversarial (19), property-diff (40)
- [x] Typecheck clean
- [x] **Full 14-critic panel passed** (2026-06-06) — P1 circular-ref fix,
  P2 `request-schema-property-added` type gap fixed, P2 pin tests for allOf/remote-$ref.
  See `CRITIQUE_LOG.md`. 5.7.2 escalating critique passed.
- [x] **5.7.5 bug-hunt (2026-06-06)** — found and fixed `$ref` parameter resolution gap:
  parameters specified via `$ref: "#/components/parameters/X"` were silently dropped.
  Fixed `parseSharedParameters()` + updated `parseParameter`/`parseParameters`/`parseOperations`.
  4 new tests.
- [x] **5.7.5 bug-hunt (2026-06-06, continuation)** — systematic "parsed-but-never-diffed" audit
  found and fixed 4 gaps:
  - Array `items` schema: `array<string>` → `array<integer>` was invisible. Added `diffSchemaItems()`.
  - Property-level `enum` changes: removing enum values from request property (BREAKING) or adding to
    response property (BREAKING for exhaustive clients) were invisible.
  - Operation `deprecated` flag: changing `deprecated: false → true` was invisible.
  - Property-level `format` changes: `format: date → date-time` was invisible.
  23 new tests total. Also fixed: required-body removal classified
  BREAKING (before=true,after=null previously fell to INFO); request-body nullable
  changes now detected (request-schema-nullable-changed); items type constraint
  addition/removal now direction-aware (response loses=BREAKING, gains=INFO;
  request gains=BREAKING, loses=INFO).
- [x] **5.7.5 bug-hunt (2026-06-06, round 3)** — 5.7.2 escalating critique (3rd pass) identified
  two architectural fragility issues + continued "parsed-but-never-diffed" audit:
  - **Completeness guard**: Added `Record<OapiChangeType,[unknown,unknown]>` TYPE_STUBS to
    classify.test.ts — TypeScript exhaustiveness forces stub entry for every new OapiChangeType;
    runtime test verifies no type falls through to the silent "Change detected at" fallback.
  - **Rule-ordering comment**: Added ordering-invariant documentation to CLASSIFY_RULES.
  - `properties[k].nullable`: response false→true = BREAKING, request true→false = BREAKING.
  - `items.enum`: direction-aware (response values added = BREAKING; request values removed = BREAKING).
  - `items.nullable`: response false→true = BREAKING, request true→false = BREAKING.
  - `parameter.deprecated`: field declared in `OapiParameter` type since inception but never
    extracted by parser. Now parsed and diffed; both directions = INFO.
  6 new OapiChangeType values + parameter-deprecated-changed = 7 total. 70 new tests.
  **231/231 tests.**
- [x] **5.7.4 "nothing is ever done" review (2026-06-06)** — adversarial review found:
  `readOnly`/`writeOnly` schema fields were the most embarrassing Phase 0 gap (standard
  in real-world specs, completely absent from parser/diff/classify); and 5 known limitations
  were underdocumented (remote $ref silent behavior, allOf composition ignored, constraints
  undetected, media-type narrowing invisible). Fixed:
  - `readOnly`/`writeOnly` added to OapiSchema type, parser, diff, and classify.
    Response property `writeOnly` false→true = BREAKING; Request property `readOnly`
    false→true = BREAKING. All other directions = INFO.
  - Known limitations rewritten to be user-facing: explicit warning that remote $refs
    silently produce empty schema, allOf members are ignored, constraint fields not diffed.
  4 new OapiChangeType values, 6 classify rules, 16 new tests. **247/247 tests.**
- [x] **5.7.4 continuation + 5.7.5 round 4 (2026-06-06)** — "parsed-but-never-diffed" audit
  continued, removing three remaining known limitations:
  - **allOf composition flattened** (was stored but never merged): parser now calls
    `flattenAllOf()` post-normalization; required[] unioned, properties merged (parent wins),
    scalar fields (`type`, `format`, `nullable`, etc.) inherited from members. 6 new parser
    tests. Breaking changes in allOf base schemas now detected.
  - **Recursive property diffing** (was 1 level only): `diffSchemaProperties()` now recurses
    into nested object schemas up to `MAX_PROPERTY_DEPTH = 5`; full dotted path in `location`.
    Cycle-safe. 5 new tests.
  - **Schema constraint field diffing**: `minimum`, `maximum`, `minLength`, `maxLength`,
    `pattern`, `minItems`, `maxItems` parsed (7 constraint fields added to `OapiSchema` + parser)
    and diffed (constraint comparison loop in `diffSchemaProperties`). Direction-aware
    classification: request tightening = BREAKING, loosening = INFO; response loosening =
    BREAKING, tightening = INFO. Pattern changes = always BREAKING for both.
    2 new OapiChangeType values. 13 new classify tests + 5 recursive diff tests + 6 allOf
    parser tests. **275/275 tests.**
- [x] **5.7.4 continuation — parameter nullable diffing** — `nullable` on parameter schemas
  was never compared. For Swagger 2.0 APIs using `nullable: true`, a change from
  `nullable: true → false` means clients sending null will fail (BREAKING). Added
  `parameter-nullable-changed` OapiChangeType + 2 classify rules + 2 unit tests.
  **306/306 tests.**
- [x] **5.7.4 continuation — nested property items diffing** — array-typed properties (e.g.
  `user.tags: {type: array, items: {type: string}}`) had their `items` schema invisible to
  the diff engine. A change from `array<string>` to `array<integer>` in a response property
  was silent. Fixed: `diffSchemaItems` is now called in the property loop inside
  `diffSchemaProperties`, guarded by `bProp.items || cProp.items`. 3 new tests.
  **303/303 tests.**
- [x] **5.7.4 continuation — nested required field diffing** — `diffSchemaRequiredFields`
  was only called at the top level (request body + response schema), not recursively.
  Adding `required: [city]` to a nested `address` object schema was invisible. Fixed:
  `diffSchemaRequiredFields` is now called inside the `diffSchemaProperties` recursive
  block. 3 new tests (request BREAKING, response INFO, response removal BREAKING).
  **300/300 tests.**
- [x] **5.7.4 continuation — parameter + items constraint diffing** — "nothing is done"
  review identified two gaps: parameter schema constraints (e.g., `maximum: 100→50` on an
  integer query parameter) and array items constraints (e.g., `items.minLength: 5→2`) were
  both invisible despite constraint fields being parsed. Implemented constraint comparison
  loops in `diffParameters` and `diffSchemaItems`. 3 new OapiChangeType values
  (`parameter-constraint-changed`, `request-schema-items-constraint-changed`,
  `response-schema-items-constraint-changed`) with direction-aware classify rules matching
  the existing property constraint classification logic. 10 new unit tests + 2 adversarial
  integration tests. **297/297 tests.**
- [x] **5.7.5 round 8 — parameter items constraints + items.properties recursion** —
  two more gaps: (1) `parameter.schema.items` had type/format/enum/nullable added in
  round 7 but constraint fields were still not compared. A query parameter `?codes` with
  `items.minLength: 3→8` was invisible. Added constraint loop for parameter items.
  1 new OapiChangeType `parameter-items-constraint-changed`, direction-aware classify rule,
  3 unit tests. (2) `diffSchemaItems` did not recurse into items object properties. A
  response `array<{id: string, count: integer}>` having `count` change to `string` was
  invisible. Fixed: `diffSchemaItems` now calls `diffSchemaRequiredFields` and
  `diffSchemaProperties` on items schemas when `properties`/`required` are present.
  Reuses existing change types with location including `.items.properties.X`. 3 adversarial
  integration tests + 1 parser test. **345/345 tests.**
- [x] **5.7.5 round 7 — array parameter items diffing** — parsed-but-never-diffed audit
  found that `items` on array-type parameters (e.g., `GET /items?ids=1,2,3` with
  `schema: {type: array, items: {type: string}}`) was completely ignored. A parameter
  changing from `array<string>` to `array<integer>` was invisible. Added items sub-field
  comparison in `diffParameters` for `type`, `format`, `enum`, `nullable`. 4 new
  OapiChangeType values (`parameter-items-type-changed`, `parameter-items-format-changed`,
  `parameter-items-enum-changed`, `parameter-items-nullable-changed`), 5 classify rules
  (type/format BREAKING; enum direction-aware; nullable direction-aware), 6 unit tests,
  2 adversarial integration tests. **337/337 tests.**
- [x] **5.7.5 round 6 — top-level body schema format + enum diffing** — systematic
  parsed-but-never-diffed audit found that `format` and `enum` on the request/response
  body schema itself (not inside properties) were never compared. An endpoint accepting
  a raw `date`-formatted string body changing to `date-time` format was invisible.
  Similarly, a GET returning a raw enum string having values added/removed was invisible.
  New: `request-schema-format-changed` / `response-schema-format-changed` (both BREAKING);
  `request-schema-enum-changed` / `response-schema-enum-changed` (direction-aware: request
  values removed=BREAKING, response values added=BREAKING). `diffSchemaTopLevelFields`
  helper wired into `diffRequestBody` and `diffResponses`. 4 new OapiChangeType values,
  4 classify rules, 4 unit tests, 2 adversarial integration tests.
  **325/325 tests.**
- [x] **5.7.5 / 5.7.2 round 5 — allOf constraint inheritance + top-level body schema
  constraints** — escalating critique found two gaps: (1) `flattenAllOf` merged `type`,
  `format`, `nullable`, `readOnly`, `writeOnly`, `items`, `enum` from `allOf` members into
  the parent schema, but NOT the 7 constraint fields (`minimum`/`maximum`/`minLength`/
  `maxLength`/`pattern`/`minItems`/`maxItems`). A constraint change in an `allOf` base schema
  (e.g., `minLength: 3→10`) was invisible because the flattened schema never carried the
  constraint. Fixed: added constraint inheritance loop to `flattenAllOf` (2 loops: numeric
  fields + pattern). (2) `diffRequestBody` and `diffResponses` called `diffSchemaProperties`,
  `diffSchemaItems`, and `diffNullable` but never a top-level constraint comparison — meaning
  a request body that is a scalar string/array (not an object with properties) would never
  have its `minLength`/`maxItems`/etc. compared. Fixed: added `diffSchemaTopLevelConstraints`
  helper called from both. 6 new adversarial integration tests (allOf constraint inheritance ×2
  + top-level body constraint tightened/loosened ×2 for request + ×2 for response).
  **313/313 tests.**

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
| Request property added | INFO |
| Response array element type changed | BREAKING |
| Request array element type changed | BREAKING |
| Response property enum values added (new) | BREAKING |
| Response property enum values removed | INFO |
| Request property enum values removed | BREAKING |
| Request property enum values added | INFO |
| Response property format changed | BREAKING |
| Request property format changed | BREAKING |
| Operation deprecated (false → true) | INFO |
| Operation un-deprecated (true → false) | INFO |
| Required request body removed from spec | BREAKING |
| Request body schema nullable true→false | BREAKING |
| Request body schema nullable false→true | INFO |
| Response property became nullable (false→true) | BREAKING |
| Response property became non-nullable (true→false) | INFO |
| Request property became non-nullable (true→false) | BREAKING |
| Request property became nullable (false→true) | INFO |
| Response array items enum values added | BREAKING |
| Response array items enum values removed | INFO |
| Request array items enum values removed | BREAKING |
| Request array items enum values added | INFO |
| Response array items became nullable (false→true) | BREAKING |
| Response array items became non-nullable (true→false) | INFO |
| Request array items became non-nullable (true→false) | BREAKING |
| Request array items became nullable (false→true) | INFO |
| Parameter deprecated (false→true) | INFO |
| Parameter un-deprecated (true→false) | INFO |
| Response property gained readOnly (false→true) | INFO |
| Response property lost readOnly (true→false) | INFO |
| Response property became writeOnly (field disappears) | BREAKING |
| Response property lost writeOnly (field now appears) | INFO |
| Request property became readOnly (clients can't send) | BREAKING |
| Request property lost readOnly (clients can now send) | INFO |
| Request property became writeOnly | INFO |
| Request property lost writeOnly | INFO |
| Request property constraint tightened (minLength↑, maxLength↓, etc.) | BREAKING |
| Request property constraint loosened | INFO |
| Request property constraint added (null→value) | BREAKING |
| Request property constraint removed (value→null) | INFO |
| Request property pattern changed | BREAKING |
| Response property constraint loosened (minLength↓, maxLength↑, etc.) | BREAKING |
| Response property constraint tightened | INFO |
| Response property constraint removed (value→null) | BREAKING |
| Response property constraint added (null→value) | INFO |
| Response property pattern changed | BREAKING |
| Parameter constraint tightened (minLength↑, maxLength↓, etc.) | BREAKING |
| Parameter constraint loosened | INFO |
| Parameter constraint added (null→value) | BREAKING |
| Parameter constraint removed (value→null) | INFO |
| Parameter pattern changed | BREAKING |
| Request array items constraint tightened | BREAKING |
| Request array items constraint loosened | INFO |
| Response array items constraint loosened | BREAKING |
| Response array items constraint tightened | INFO |
| Response array items constraint removed | BREAKING |
| Response array items pattern changed | BREAKING |

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

- **No remote `$ref` resolution.** `$ref` pointing to an external file or URL
  is silently resolved to the empty schema `{}` — the endpoint appears to have
  no schema. You will see **no diff output** for fields defined in a remote ref,
  even if they changed. Only `#/components/schemas/X`, `#/definitions/X`,
  `#/components/parameters/X`, and `#/parameters/X` (local refs) are resolved.
  Tested behavior.
- **Circular `$ref` terminates at depth 2.** A self-referential schema (e.g.,
  `Node.properties.next.$ref = "Node"`) is resolved one level deep; the
  second-level back-edge returns `{}`. No stack overflow. Tested behavior.
- **`allOf` composition is flattened (Phase 0, 2026-06-06).** `allOf` members are
  merged into the parent schema before diffing: `required[]` arrays are unioned,
  `properties` maps are merged (parent takes precedence on key conflict), and scalar
  fields (`type`, `format`, `nullable`, etc.) are inherited from members when not
  set by the parent. Breaking changes introduced in `allOf` base schemas (e.g. an
  inherited field becoming required, or an inherited property's type changing) are
  now correctly detected. Tested behavior (7 new tests).
- **`oneOf`/`anyOf` composition is NOT merged.** `oneOf: [{$ref: "A"}, {$ref: "B"}]`
  semantics require per-variant comparison (which variant did the client use?);
  that analysis is genuinely complex. `oneOf`/`anyOf` members remain stored but not
  flattened. A breaking change inside only one `oneOf` variant will not be detected.
  Phase 2. Tested behavior.
- **Property diff is recursive to 5 levels deep (Phase 0, 2026-06-06).** Nested
  object schemas are recursively compared: a type change in `user.address.zipCode`
  generates a `response-schema-property-type-changed` event with the full dotted
  path in `location`. Cycle-safe: stops at `MAX_PROPERTY_DEPTH = 5` without
  throwing. Tested behavior (5 new tests).
- **`uniqueItems`, `default`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf` not diffed.**
  JSON Schema / OAS 3.1 draft-07 fields `uniqueItems`, `default`, `exclusiveMinimum`,
  `exclusiveMaximum`, `multipleOf` are not parsed or compared. Phase 2.
- **No media-type coverage.** The engine uses the first `content` entry returned
  by the YAML parser. An endpoint that dropped `application/xml` support while
  keeping `application/json` will show no change. Phase 2.

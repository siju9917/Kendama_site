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
- [x] **5.7.5 bug — Swagger 2.0 path-level body parameter silently ignored** — `buildSwagger2RequestBody`
  was called with only `opLevelParams`; a body parameter defined at path level (valid per Swagger 2.0
  spec) was silently dropped, leaving `requestBody: null` for every operation on that path. Fix:
  pass `[...opLevelParams, ...pathLevelParams]` to the function (op-level first, so `find()` returns
  op-level body when present, path-level otherwise). +2 new failing-first tests (path-level body
  inherited; op-level body overrides path-level). +2 coverage tests regression-locking behavior that
  was already correct (op-level overrides path-level for non-body params; `application/json` preferred
  over other content types when multiple coexist). **349/349 tests.**
- [x] **5.7.5 round 13 — response items null-transition classify gaps** — three bugs where
  `response-schema-items-*-changed` with `before=null` (constraint newly added) was incorrectly
  classified as BREAKING instead of INFO, or had a cryptic generic fallback message:
  (1) `response-schema-items-type-changed: null→type` fell through to generic "Change detected
  at..." message (severity INFO was correct via fallback, but message was wrong). Fixed: added
  specific INFO rule with meaningful message.
  (2) `response-schema-items-format-changed: null→format` was unconditionally BREAKING — adding
  a format to response items is non-breaking (server announces stronger guarantee). Fixed:
  split rule into `before !== null → BREAKING` and `before === null → INFO`.
  (3) `response-schema-items-enum-changed: null→enum` was BREAKING via the `!before || !after`
  guard — adding an enum to response items is INFO (server promises fewer values, not more).
  Fixed: distinguish `!before && after → INFO` from `before && !after → BREAKING`.
  Also fixed `request-schema-items-type-changed: type→null` (INFO but had generic message).
  +12 tests (6 classify unit + 6 adversarial integration). **389/389 tests.**
- [x] **5.7.5 round 16 — `additionalProperties: false` closing/opening not detected** — a common
  OpenAPI pattern (`additionalProperties: false` = closed schema, reject extra properties) was
  completely invisible to the diff engine. Neither the parser, diff, nor classify had any awareness
  of this field. Fixed:
  - `OapiSchema`: added `additionalProperties?: boolean` field
  - `parser.ts` `normalizeSchema`: extracts `additionalProperties` when it's a boolean value (schema-valued
    additionalProperties not supported — Phase 2)
  - `flattenAllOf`: inherits `additionalProperties` from allOf members when parent doesn't define it
  - `diff.ts`: two new diff helpers (`diffAdditionalProperties`, `diffPropertyAdditionalProperties`)
    wired into `diffRequestBody`, `diffResponses`, and the `diffSchemaProperties` property loop
  - Two new top-level and two new property-level OapiChangeType values (4 total)
  - Classify rules (direction-aware): request side `true→false` = BREAKING (clients with extra
    properties will get 400); `false→true` = INFO; response side: both directions = INFO (annotation
    only, server's guarantee narrows or relaxes)
  +14 tests (4 TYPE_STUBS + 6 classify unit + 4 adversarial integration). **442/442 tests.**
- [x] **5.7.5 round 17 — pattern constraint null-transitions incorrectly classified** — six classify
  rules contained `if (loc.endsWith(".pattern")) return "BREAKING"` unconditionally, ignoring whether
  the pattern was being ADDED (before=null) or REMOVED (after=null). Bug class: same null-transition
  direction blindness fixed in rounds 13-15 for format/enum/type, now at pattern constraint sites.
  Correct semantics:
  - Request-side (property, parameter, items, parameter-items): pattern REMOVED (`after=null`) = INFO
    (constraint relaxed, clients sending previously-valid values still pass); pattern ADDED or CHANGED = BREAKING.
  - Response-side (property, items): pattern NEWLY ADDED (`before=null`) = INFO (server narrows own
    guarantee, clients benefit); pattern REMOVED or CHANGED = BREAKING (server may now return values
    not matching old pattern; clients validating pattern will break).
  Fixed 6 sites in classify.ts: `request-schema-property-constraint-changed`,
  `response-schema-property-constraint-changed`, `parameter-constraint-changed`,
  `request-schema-items-constraint-changed`, `response-schema-items-constraint-changed`,
  `parameter-items-constraint-changed`. Also improved message functions at all 6 sites to emit
  direction-aware messages (removed/added/changed) instead of a single generic "changed" message.
  +16 tests (12 classify unit + 4 adversarial integration). **458/458 tests.**
- [x] **5.7.5 round 18 — `diffSchemaItems` never compared `additionalProperties` on the items schema** —
  the items schema's `additionalProperties` field was completely absent from `diffSchemaItems`, meaning
  a request array that previously accepted elements with extra properties (`additionalProperties: true`)
  being closed (`additionalProperties: false`) was completely invisible — a BREAKING change missed
  entirely. Response-side closing was also invisible (INFO — server now guarantees clean elements).
  Fixed: added `additionalProperties` comparison inside `diffSchemaItems`, normalizing absent/true → true
  (same semantics) and detecting the `true ↔ false` transition. Added 2 new OapiChangeType values
  (`request-schema-items-additional-properties-changed`, `response-schema-items-additional-properties-changed`),
  4 direction-aware classify rules (request `true→false` = BREAKING; request `false→true` = INFO;
  response both directions = INFO — mirrors body-level and property-level semantics). TYPE_STUBS updated
  (+2 entries). +8 tests (2 TYPE_STUBS completeness + 4 classify unit + 2 adversarial integration).
  **466/466 tests.**
- [x] **5.7.5 round 19 — enum comparison was order-sensitive (false-positive spurious events)** —
  `deepEqual` uses `JSON.stringify`, which is order-sensitive for arrays: `["a","b"]` ≠ `["b","a"]`
  even though both represent the same set of allowed values. A spec that merely reorders its enum
  values (common in auto-generated specs) would emit a spurious INFO event with empty `added=[]` and
  `removed=[]` lists. The misleading message ("N values added, M values removed: none") was confusing
  at best and noise-polluting at worst.
  Fixed: added `enumSetsEqual()` helper in `diff.ts` that compares enum arrays as sets using
  `JSON.stringify` per element (handles non-string values like numbers/booleans correctly). Replaced
  all 5 `!deepEqual(x.enum, y.enum)` sites with `!enumSetsEqual(x.enum, y.enum)`:
  - `diffParameters` L46 — parameter schema enum
  - `diffParameters` L92 — parameter items enum
  - `diffSchemaProperties` L232 — property enum
  - `diffSchemaItems` L382 — items enum
  - `diffSchemaTopLevelFields` L572 — top-level body enum
  Genuine enum changes (values added or removed) continue to produce correct events.
  +7 adversarial integration tests (5 reorder-no-event + 2 genuine-change-still-detected).
  **473/473 tests.**
- [x] **5.7.5 round 20 — `diffSchemaItems` additionalProperties fired spuriously for newly-added items** —
  The `additionalProperties` comparison block in `diffSchemaItems` was outside the `if (bItems && cItems)`
  guard that protects readOnly/writeOnly comparisons. When items were newly added (bItems=undefined),
  `bAP = bItems?.additionalProperties ?? true = true` while `cAP = false` (if the new items schema had
  `additionalProperties: false`) — producing a spurious `items-additional-properties-changed` event
  alongside the expected `items-type-changed` (null→object) event.
  Fix: merged the additionalProperties block into the existing `if (bItems && cItems)` guard, consistent
  with the round 10 fix for readOnly/writeOnly (same rationale: "avoids double-reporting when items are
  newly added — that case is already covered by items-type-changed with before=null"). The pre-existing
  round 18 tests for both-items-exist still pass; the new tests confirm no spurious event when items are
  newly added.
  +3 adversarial integration tests (2 no-spurious + 1 regression that existing detection still works).
  **476/476 tests.**
- [x] **5.7.5 round 21 — `diffSchemaItems` format/enum/nullable/constraints fired spuriously for newly-added/removed items** —
  Round 20 moved `additionalProperties` inside the `if (bItems && cItems)` guard. Rounds 21 applies the
  same principle to the four remaining field comparison groups that were still outside the guard: format,
  enum, nullable, and constraint fields. When items are newly added (`bItems=undefined`) or removed
  (`cItems=undefined`), these comparisons would fire events alongside `items-type-changed`, producing
  spurious (often BREAKING) findings:
  - Format newly added: fires `items-format-changed` alongside `items-type-changed`
  - Enum newly added: fires `items-enum-changed` alongside `items-type-changed` (BREAKING for request)
  - Constraint newly added: fires `items-constraint-changed` alongside `items-type-changed` (BREAKING for request)
  Fix: unified all scalar field comparisons inside a single `if (bItems && cItems)` guard. The items
  `type` comparison stays OUTSIDE the guard — it IS the primary detection mechanism for newly-added/removed
  items. Recursion into items.properties and items.items also stays outside to continue detecting structural
  changes in those sub-schemas. All 481 pre-existing tests still pass; genuine changes on pre-existing items
  schemas continue to produce events.
  +5 adversarial integration tests (3 no-spurious + 2 genuine-change-still-detected).
  **481/481 tests.**
- [x] **5.7.5 round 22 — `diffParameters` parameter items scalar fields fired spuriously for newly-added items** —
  Same guard principle as rounds 20–21, now applied to the parameter items block in `diffParameters`.
  When a parameter changes from non-array (no items schema) to array (with items including format/enum/
  nullable/constraints), the scalar field comparisons would fire alongside `parameter-items-type-changed`.
  Fix: moved format, enum, nullable, and constraint comparisons inside an inner `if (bItems && cItems)`
  guard, while the type comparison remains outside as the primary detector. +2 adversarial tests.
  **483/483 tests.**
- [x] **5.7.5 round 23 — response enum-removed message says "values may be added" instead of "enum removed"** —
  Two classify rules had wrong message text for the `before=array, after=null` (enum REMOVED from response) case:
  - `response-schema-property-enum-changed` message: "Response property enum changed at X: values may be added" —
    says the wrong direction (values aren't being ADDED; the whole enum constraint was REMOVED)
  - `response-schema-items-enum-changed` message: "Response array items enum changed: X" — vague/generic;
    doesn't communicate that enum was removed and exhaustive clients break
  Both had their `!before || !after` catch-all also handling the `before && !after` case together. Split
  into explicit `before && !after` branch (proper "enum removed" message) vs remaining null-null edge.
  Severity (BREAKING) was already correct — only messages were wrong.
  +2 classify unit tests (message content check for both types). **485/485 tests.**
- [x] **5.7.5 round 24 — top-level body schema `readOnly`/`writeOnly` missing from diff** —
  Post-round-23 audit revealed that `readOnly`/`writeOnly` were compared at property level
  (added in round 10) and at items level, but NOT at the top-level body schema. A request body
  schema going from `readOnly: false` to `readOnly: true` (BREAKING — server will reject the
  body) and a response body schema going from `writeOnly: false` to `writeOnly: true` (BREAKING
  — payload disappears from responses) were completely invisible.
  Fixed: added `diffSchemaTopLevelReadOnlyWriteOnly()` helper in `diff.ts`, wired into both
  `diffRequestBody` and `diffResponses`. Added 4 new OapiChangeType values
  (`request-schema-readonly-changed`, `response-schema-readonly-changed`,
  `request-schema-writeonly-changed`, `response-schema-writeonly-changed`). Added 6 classify
  rules (direction-aware): request readOnly false→true = BREAKING; response writeOnly false→true
  = BREAKING; all other directions = INFO (mirrors property/items rules). TYPE_STUBS updated
  (+4 entries). +10 tests (4 TYPE_STUBS completeness + 6 adversarial integration). **495/495 tests.**
- [x] **5.7.5 round 26 — `response-schema-nullable-changed` BREAKING/INFO polarity inverted** —
  Post-round-25 escalating critique (5.7.2 second independent hard pass) found that the
  `response-schema-nullable-changed` (top-level body schema) had inverted BREAKING/INFO
  classification vs the property-level and items-level rules (which were both correct):
  - **Was** (wrong): `before=true, after=false` = BREAKING; `before=false, after=true` = INFO.
  - **Correct**: `before=false, after=true` = BREAKING (server may now return null where clients
    assumed non-null — crash on null dereference); `before=true, after=false` = INFO (server
    tightens guarantee, clients benefit from non-null guarantee — no client breakage).
  The message for the BREAKING case was also wrong ("Clients handling null values will need to be
  updated" — implies dead code, not crash risk). Fixed: swapped the two rules; updated messages to
  accurately describe the breaking scenario (clients that assume non-null will crash) and the info
  scenario (server now guarantees non-null). Fixed two classify unit tests that were asserting the
  wrong expected severity. Updated TYPE_STUBS to use the BREAKING case (false→true). Added 4
  adversarial integration tests: BREAKING direction, INFO direction, plus 2 contrast tests
  confirming property and items levels are consistently BREAKING for false→true.
  +4 adversarial tests, +0 new types. **521/521 tests.**
- [x] **5.7.5 round 25 — `minProperties`/`maxProperties` constraints missing** — OpenAPI defines
  `minProperties` (minimum number of object properties required) and `maxProperties` (maximum
  allowed) as standard constraint fields. Neither was in `OapiSchema`, the parser, `flattenAllOf`,
  or any constraint comparison loop. Request schema `minProperties: 0→2` (BREAKING — server now
  rejects objects with fewer properties) was invisible. Response schema `maxProperties: 5→10`
  (BREAKING — server may return more properties than clients expect) was also invisible.
  Fixed: added `minProperties`/`maxProperties` to `OapiSchema`, `normalizeSchema`, `flattenAllOf`
  numeric constraint loop, all 5 constraint field arrays in `diff.ts`, and all 6 constraint
  classify rules' `loc.endsWith` checks for direction-aware severity. Uses existing change types.
  +6 adversarial integration tests. **501/501 tests.**
- [x] **5.7.5 round 15 — request-side constraint removal classified as BREAKING instead of INFO** —
  systematic audit of all request-side classify rules found 11 cases where a constraint being REMOVED
  from the server spec (before=value, after=null/undefined) was incorrectly classified as BREAKING.
  When a server removes a constraint from its request schema, it becomes MORE permissive — clients
  sending previously-valid values are still valid. Correct classification: INFO.
  Fixed change types: `parameter-type-changed (after=null)`, `parameter-format-changed (after=null)`,
  `parameter-enum-changed (after=null)`, `request-schema-format-changed (after=null)`,
  `request-schema-property-format-changed (after=null)`, `request-schema-property-enum-changed (after=null)`,
  `request-schema-enum-changed (after=null)`, `request-schema-items-format-changed (after=null)`,
  `request-schema-items-enum-changed (after=null)`, `parameter-items-type-changed (after=null)`,
  `parameter-items-format-changed (after=null)`, `parameter-items-enum-changed (after=null)`.
  Root cause: the "BREAKING if `!before || !after`" guard pattern and unconditional-BREAKING rules did
  not distinguish "constraint added" from "constraint removed" — both hit BREAKING.
  Fix pattern: for format/type → `c.after !== null ? "BREAKING" : "INFO"`; for enum →
  `!before && after → BREAKING`, `before && !after → INFO`. Verified direction-aware messages for
  all cases. +27 tests (21 classify unit + 6 adversarial integration). **428/428 tests.**
- [x] **5.7.5 round 14 — response property/body null-transition classify gaps** — same systematic
  bug class as round 13, now at property and body levels. Four classify rules incorrectly treated
  "constraint newly added" (before=null) as BREAKING:
  (1) `response-schema-property-format-changed: null→format` — adding format to a response property
  is INFO (server narrows its guarantee, non-breaking for clients). Fixed: split to
  `before !== null → BREAKING` and `before === null → INFO`.
  (2) `response-schema-property-enum-changed: null→enum` — adding enum to a response property is
  INFO. Fixed: distinguish `!before && after → INFO` from `before && !after → BREAKING`.
  (3) `response-schema-format-changed: null→format` (body-level) — same fix as (1) at body level.
  (4) `response-schema-enum-changed: null→enum` (body-level) — same fix as (2) at body level.
  All four fixes are the mirror of the round-13 items-level fixes, completing the null-transition
  coverage across all three schema nesting levels (items, property, body). +12 tests
  (6 classify unit + 6 adversarial integration). **401/401 tests.**
- [x] **5.7.5 round 11 — `request-body-required` direction completeness** — `diffRequestBody`
  only emitted `request-body-required-changed` for `false→true` (body became required = BREAKING).
  The reverse `true→false` (body became optional = INFO) was never emitted. Also, `false→null`
  (optional body removed from spec) fell through to a cryptic generic fallback. Fix: added
  `true→false` emission in `diffRequestBody`; added `false→null` INFO classify rule with
  meaningful message. +2 adversarial tests. **375/375 tests.**
- [x] **5.7.5 round 12 — `diffSchemaItems` recursion depth guard** — `diffSchemaItems`
  recursed into `items.items` without a depth bound. A schema with 5+ levels of nested arrays
  would produce infinite recursion and stack overflow. Fix: added `MAX_ITEMS_DEPTH = 3`
  constant, `depth` parameter, and early return at limit. Also fixed an incorrect test that
  asserted `changes.length > 0` for a change beyond the depth limit — corrected to assert only
  `not.toThrow()` (the guard's purpose is crash prevention, not change detection beyond limit).
  +2 adversarial tests. **377/377 tests.**
- [x] **5.7.5 round 9 — `diffSchemaType` null-transition gap** — `diffSchemaType` guarded
  `bType !== undefined && cType !== undefined`, silently dropping body schema type-added
  (undefined→string) and type-removed (string→undefined) transitions — same pattern as item 54's
  property fix. Fix: null sentinel (`?? null`) + direction-aware rules (2→4): request type-added
  = BREAKING, request type-removed = INFO; response type-removed = BREAKING, response type-added
  = INFO. +8 tests (4 classify unit + 4 adversarial integration). **357/357 tests.**
- [x] **5.7.5 round 10 — items `readOnly`/`writeOnly` parsed-but-never-diffed** — `diffSchemaItems`
  compared type, format, enum, nullable, and constraints but NOT `readOnly`/`writeOnly`. An array
  response changing `items.writeOnly: false → true` (items disappear from responses = BREAKING) was
  invisible. Fix: compare readOnly/writeOnly in `diffSchemaItems` when both schemas exist (guarded
  to avoid double-reporting when items schema is newly added). 4 new OapiChangeType values, 6 classify
  rules (response writeOnly false→true = BREAKING; request readOnly false→true = BREAKING; all others
  INFO), +10 new tests (6 classify unit + 4 adversarial integration including spurious-event guard).
  **371/371 tests.**
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
| Response body schema nullable: true→false | INFO |
| Response body schema nullable: false→true | BREAKING |
| Endpoint added | INFO |
| Optional parameter added | INFO |
| Parameter required: true→false | INFO |
| Request schema field required→optional | INFO |
| Response status code added | INFO |
| Response field guaranteed as required | INFO |
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
| Response array items became writeOnly (false→true) | BREAKING |
| Response array items lost writeOnly (true→false) | INFO |
| Response array items became readOnly (false→true) | INFO |
| Response array items lost readOnly (true→false) | INFO |
| Request array items became readOnly (false→true) | BREAKING |
| Request array items lost readOnly (true→false) | INFO |
| Request array items became writeOnly | INFO |
| Request array items lost writeOnly | INFO |
| Response array items type constraint added (null→type) | INFO |
| Response array items type constraint removed (type→null) | BREAKING |
| Response array items format constraint added (null→format) | INFO |
| Response array items enum added (null→enum) | INFO |
| Response array items enum removed (enum→null) | BREAKING |
| Request array items type constraint removed (type→null) | INFO |

---

## Phase 1 — VS Code extension scaffold (COMPLETE — 2026-06-06)

_Built 2026-06-06, ahead of the Proposal #3 auto-proceed date (2026-06-13). All Phase 1
checklist items complete; 573 tests passing; typecheck clean; build:ext clean._

### Architecture (designed 2026-06-06, before build window)

**Directory structure:**
```
products/openapi-lens/
  package.json           ← add VS Code extension manifest fields
  src/
    engine/              ← existing Phase 0 code (no changes)
    extension/
      extension.ts       ← activation + deactivation entry point
      providers/
        diagnosticProvider.ts  ← converts BreakingChange[] → vscode.Diagnostic[]
        codeLensProvider.ts    ← "X BREAKING, Y INFO" above openapi: declaration
      baseline/
        gitBaseline.ts         ← fetch spec at git HEAD via git extension API
        fileBaseline.ts        ← manual baseline via file picker
      openApiDetector.ts       ← detects if a document is an OpenAPI spec
      commands.ts              ← registerCommand bindings
```

**Activation flow:**
1. Activate on `onLanguage:yaml` and `onLanguage:json`.
2. `extension.ts` calls `openApiDetector.isOpenApiDocument(doc)` before doing any work.
3. If true, fetch baseline (git HEAD first, then configured fallback).
4. Parse baseline + current with `parseOapiSpec`, diff, classify.
5. Map `BreakingChange[]` to `vscode.Diagnostic[]` (BREAKING → error; INFO → information).
6. Push to `DiagnosticCollection`.

**Key VS Code APIs:**
- `vscode.languages.createDiagnosticCollection("openapi-lens")` — manage squiggles
- `vscode.languages.registerCodeLensProvider({language: 'yaml'}, provider)` — CodeLens
- `vscode.workspace.onDidSaveTextDocument(handler)` — re-analyze on save (not on keystroke)
- `vscode.extensions.getExtension('vscode.git')` — access git API for HEAD comparison
- `vscode.commands.registerCommand('openapi-lens.selectBaseline', handler)` — manual baseline
- `vscode.window.showInformationMessage(msg)` — status feedback

**Diagnostic mapping:**
```typescript
// BREAKING → vscode.DiagnosticSeverity.Error (red squiggle)
// INFO → vscode.DiagnosticSeverity.Information (blue squiggle)
// Map location string to Range using YAML/JSON AST node lookup
```

**Baseline strategy (priority order):**
1. If `settings.openapi-lens.baselineFile` is set → use that file.
2. Else if git extension is available → `git show HEAD:<rel-path>` for the spec at HEAD.
3. Else → show "Set baseline" CodeLens prompt (no diff without a baseline).

**Location → Range mapping:**
The engine's `location` field is a dotted path string (e.g.,
`responses[200].content.schema.properties.name.type`). To convert to a VS Code Range,
use `js-yaml` with `onMark` or `yaml-ast-parser` to build an AST node map during parse,
then look up the nearest ancestor key whose path matches the location prefix.

**Checklist:**
- [x] VS Code extension manifest (`package.json` extensions fields: `main`, `activationEvents`,
  `contributes.commands`, `contributes.configuration`, `engines.vscode`)
- [x] Activation on YAML/JSON file open (`onLanguage:yaml`, `onLanguage:json`)
- [x] `openApiDetector.ts`: check for `openapi:` or `swagger:` top-level key in document text
- [x] `diagnosticProvider.ts`: `BreakingChange[]` → `vscode.Diagnostic[]` with Range lookup
- [x] `codeLensProvider.ts`: "X BREAKING, Y INFO" CodeLens at line 0; "No changes" if clean
- [x] `gitBaseline.ts`: git extension API → `git show HEAD:<path>` → baseline string
- [x] `fileBaseline.ts`: `vscode.window.showOpenDialog` → read file → baseline string
- [x] `commands.ts`: register `openapi-lens.selectBaseline` and `openapi-lens.clearBaseline`
- [x] `extension.ts`: wire all providers; dispose on deactivate; filter SAFE changes before
  passing to providers (P1 critique fix: SAFE changes must not appear as diagnostics)
- [x] Vitest unit tests for diagnosticProvider (BreakingChange → Diagnostic mapping, 11 cases)
- [x] Vitest unit tests for openApiDetector (YAML/JSON with and without openapi: key, 10 cases)
- [ ] VS Code extension test (`@vscode/test-electron`) for end-to-end activation → Phase 2

**Critique-panel findings (post-Phase-1, 2026-06-06) — ALL FIXED:**

P1 — Correctness: SAFE changes mapped to Information diagnostics. Fixed: `extension.ts`
  now filters `c.severity !== "SAFE"` before passing to providers. ✓

P2 — UX: When no baseline is available, CodeLens showed "No changes detected" (misleading).
  Fixed: `OpenApiCodeLensProvider` now uses a discriminated union with `no-baseline | clean |
  changes` states. No-baseline state shows "Set baseline to enable diff" with `selectBaseline`
  command; clean state shows "No breaking changes"; changes state shows counts. ✓

P2 — Design: `manualBaselineContent` was a global variable. Fixed: replaced with
  `Map<string, string>` keyed by `document.uri.toString()` (per-document baseline). ✓

P2 — Interface: `onBaselineSelected` had unused `label` parameter. Removed. ✓

**5.7.2 escalating critique findings (2026-06-06) — ALL FIXED:**

P1 — Terraform: data source entries (mode:"data", actions:["read"]) were misclassified as
  CRITICAL for data store types like `aws_s3_bucket`. Fixed: `isResourceChange` now filters
  `mode === "data"` entries. +4 adversarial tests. ✓

P2 — commands.ts: `selectBaseline` cleared the `baselineFile` workspace setting. Fixed:
  removed the incorrect `config.update` call. ✓

P2 — terraformExtension.ts: `openapi-lens.showTerraformPanel` command was referenced in
  the status bar but never registered. Fixed: registered in `activateTerraformSupport`
  with `lastKnownSummary`/`lastKnownPlanUri`; cleared in `deactivateTerraformSupport`. ✓

P3 — diagnosticProvider.ts: `lineText.search(/\S/)` returned -1 for empty lines, producing
  negative Range column. Fixed: `Math.max(0, ...)` clamp. ✓

**Phase 1 gate: CLEARED (2026-06-06, 697/697 tests, typecheck clean).**

**5.7.5 continuous bug-hunt (post-gate, 2026-06-06) — findings and fixes:**

- `parseOutputChanges`: sensitive output only detected boolean `true` — missed object-form
  `after_sensitive: {fieldName: true}`. Fixed: added `typeof entry["after_sensitive"] === "object"`
  check. 2 tests added. 715→715 (was 713).

- `parseResponses`: response-level `$ref` (e.g., `$ref: "#/components/responses/SuccessResponse"`)
  was silently dropped — schema never extracted, changes to shared responses undetected.
  Fixed: `parseSharedResponses` builds a lookup from `#/components/responses`; `parseResponses`
  resolves `$ref` entries before extracting schema. 3 adversarial tests added. 718 tests.

- `clearBaseline` command: `config.update(ConfigurationTarget.Workspace)` throws when no
  workspace folder is open. Fixed: wrapped in try/catch; in-memory baseline now always
  clears even if workspace setting can't be persisted. `commands.test.ts` added (3 tests). 721 tests.

### 5.7.4 "Nothing is done" review — D5 Phase 1 extension (2026-06-06)

What would make D5 Phase 1 materially better? What would a top-tier team add?

- [ ] **POLISH N1 — Baseline persistence across reload.** The in-memory
  `manualBaselineByUri` map is cleared on VS Code reload. Selecting a baseline via
  the picker sets it for the session only. A robust implementation persists the
  *file path* (not content) to workspace settings so baselines survive reload.
  Phase 2: `config.update("baselineFile", selectedPath, ConfigurationTarget.Workspace)`.

- [x] **POLISH N2 — Real-time analysis (debounced).** DONE (2026-06-06). Subscribed to
  `onDidChangeTextDocument` with 400ms debounce alongside `onDidSaveTextDocument`.
  `ReturnType<typeof setTimeout>` used for type safety. ✓

- [ ] **POLISH N3 — Semantic line location for diagnostics.** `findLineForLocation` is
  a text-search heuristic — it finds the first line matching the last path segment as a
  key string. For JSON paths like `parameters[0]`, it falls back to line 0. A Phase 2
  implementation would parse the YAML/JSON AST and walk the path for precise line numbers.

- [x] **POLISH N4 — "Comparing vs:" in WebView panel header.** DONE (2026-06-06).
  `resolveBaseline` now returns `{content, label}` — label is "git HEAD", "selected file",
  or "workspace: <filename>". Meta line in WebView shows `· baseline: <label>`. ✓

- [x] **POLISH N5 — Diagnostic message source prefix.** DONE (existing). `diag.source =
  "openapi-lens"` is set, which is the correct VS Code convention (source appears in
  Problems panel next to the message). No code change needed. ✓

### 5.7.4 "Nothing is done" review — D6 Terraform Lens Phase 1 (2026-06-06)

- [ ] **POLISH T1 — Direction-aware IAM policy diff (Phase 2 known limitation).** All
  IAM/security-group changes are conservatively flagged CRITICAL. Adding a more restrictive
  IAM policy (fewer permissions = smaller blast radius) should be INFO. Phase 2: compare
  before/after policy documents and classify the direction.

- [x] **POLISH T2 — `output_changes` classification.** DONE (2026-06-06). Parser extracts
  `output_changes` map from plan JSON; sensitive detection handles boolean AND object
  `after_sensitive`; no-op outputs filtered; WebView renders Output Changes section. ✓

- [x] **POLISH T3 — `create_before_destroy` vs `destroy_before_create` distinction.** DONE
  (2026-06-06). `replaceOrderDetail()` in classify.ts distinguishes `["create","delete"]`
  (create_before_destroy, lower downtime risk) from `["delete","create"]` (destroy_before_create,
  downtime window) from `["replace"]` (single action, Terraform 0.15+). ✓

- [x] **POLISH T4 — WebView plan context header.** DONE (2026-06-06). Meta line shows
  `N resource changes (K CRITICAL · M NORMAL · J NO-OP)` when changes > 0. ✓

## Phase 2 — Full UI + hardening (PLANNED)

- [ ] WebView panel (full classified change list, reuses BidDiff ChangeCard
  rendering pattern)
- [ ] Full critique panel pass (all 14 critics)
- [ ] Edge cases: `$ref` chains, `allOf`/`oneOf`/`anyOf` resolution,
  circular refs, remote refs (stubbed out)

### Phase 2 engine additions (identified in "nothing is done" review 2026-06-06)

- [x] **Response `headers` diff** — DONE (2026-06-06). Parser parses
  `responses[code].headers` with `$ref→#/components/headers` resolution. Diff engine
  emits `response-header-removed` (BREAKING), `response-header-added` (INFO),
  `response-header-type-changed` (BREAKING when before≠null, INFO when before=null).
  3 new `OapiChangeType` values; classify rules + TYPE_STUBS exhaustiveness test
  updated; 5 adversarial tests. ✓

- [ ] **Security scheme / scope changes** — `security:` changes on individual operations
  are invisible. Adding a new required OAuth scope to an endpoint breaks clients that
  request the old token without that scope. Removing a supported scheme (e.g., `apiKey`)
  breaks clients using that auth type. Both directions can be BREAKING depending on
  whether the change adds a requirement or removes a supported path. Requires parsing
  operation-level `security:` and diffing against baseline.

- [x] **`servers` array changes** — DONE (2026-06-06). `servers` field parsed at spec
  level (OAS 3.x `servers[].url`; Swagger 2.0 `host+basePath+schemes` computed).
  Diff engine emits `server-removed` (BREAKING) and `server-added` (INFO) changes.
  Classify rules + TYPE_STUBS + 5 adversarial tests (including base-URL swap and no-servers
  graceful handling). ✓

- [x] **`operationId` changes** — DONE (2026-06-06). `operationId` parsed per operation;
  diff engine emits `operation-id-changed` (INFO — not wire-breaking). Message explicitly
  warns about SDK generator impact (openapi-generator, autorest, kiota rename generated
  method). Classify rule + TYPE_STUBS + 4 adversarial tests. ✓

## Phase 3 — Monetization gate (at 1,000 installs)

- [ ] LemonSqueezy license key validation (same pattern as BidDiff)
- [ ] Free tier (50 analyses/day) vs Pro (unlimited + multi-branch + team)
- [ ] Marketplace listing: animated GIF demo, keywords, categories

## Phase 4 — Terraform pack (COMPLETE — 2026-06-06 as D6 Phase 1)

Built as D6 alongside D5 (same extension, two format classifiers):

- [x] `terraform show -json` plan parser (`src/terraform/parser.ts`)
- [x] Destructive-change classifier (`src/terraform/classify.ts`):
  - Rule 1: no-op → NO-OP
  - Rule 2: delete (without replace) → CRITICAL with "DELETED" message
  - Rule 3: replace (Terraform 0.15+ `replace` or `['delete','create']` or
    `['create','delete']` for create_before_destroy) → CRITICAL with "REPLACED" message
  - Rule 4: data store modification → CRITICAL (data tables in `resources.ts`)
  - Rule 5: IAM/security-group change (Phase 1 conservative — any change flagged)
  - Rule 6: pure create → NORMAL; in-place update → NORMAL
- [x] `resources.ts`: DATA_STORE_TYPES + IAM_TYPES data-driven tables with prefix matching
- [x] `webview.ts`: self-contained HTML WebView with CSP, VS Code CSS vars, HTML escaping
- [x] `terraformExtension.ts`: VS Code wiring — status bar "TF: X CRITICAL · Y NORMAL",
  WebView panel auto-opens beside editor, reuses on subsequent activations
- [x] 94 tests (classify + resources + parser + adversarial + webview)
- [x] Extension re-labeled "Breaking-Change Lens" with both formats active
- [x] 14-critic panel (first pass) — 0 P0 found
- [x] 5.7.2 escalating critique — found P1 (data source "read" → false CRITICAL) + P2
  (showTerraformPanel command unregistered); both fixed; +4 adversarial tests → 97 tf tests
- [x] Phase 4 gate: CLEARED (2026-06-06)

**Phase 4 Phase 2 backlog (planned):**
- [ ] Before/after IAM policy document diff (move beyond conservative "any change flagged")
- [ ] `output_changes` and `variable_changes` classification
- [ ] Provider-specific heuristics (RDS parameter group replacement, SG ingress direction)
- [ ] `create_before_destroy` vs `destroy_before_create` distinction (both currently CRITICAL)

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
- **Response `headers` not diffed.** Response headers (`X-Rate-Limit`, `Location`,
  etc.) are part of the API contract but not yet parsed or compared. Phase 2.
- **Security scheme / scope changes not detected.** Operation-level `security:`
  changes (new required scope, removed auth scheme) are invisible. Phase 2.
- **`servers` array not compared.** Base URL changes are not detected. Phase 2.
- **`operationId` changes not detected.** SDK-generator method-name renames are
  invisible; high impact for typed-client consumers. Phase 2.

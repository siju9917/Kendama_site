# PLAYBOOK: OpenAPI Breaking-Change Diff Engine

> Compiled from D5 Phase 0 experience (2026-06-06).
> Applies to: any new API-diff engine, D5 Phase 1 extension scaffold,
> future API-format classifiers.

---

## Core architecture

```
YAML/JSON text
   ↓ parser.ts (parseOapiSpec)
OapiSpec (operations, schemas, parameters)
   ↓ diff.ts (diffSpecs)
OapiRawChange[]  ← change type + before/after + path/method/location
   ↓ classify.ts (classifyChanges)
BreakingChange[]  ← severity (BREAKING/INFO) + human message
```

Three distinct phases. Never skip — the full pipeline must be clean before
the "Phase 0 complete" gate closes.

---

## Field-coverage discipline: the parsed-but-never-diffed audit

**The single biggest Phase 0 trap.** Every new field you add to `OapiSchema`
(or `OapiParameter`) exists in three separate surfaces:

1. **Parser** — extracts the field from YAML/JSON raw data
2. **Diff** — emits a raw change event when the field changes between specs
3. **Classify** — maps the raw event to a BREAKING/INFO rule

A field in (1) but not (2) is silently invisible. A field in (2) but not
(3) falls through to the `"Change detected at…"` INFO fallback — never
BREAKING regardless of semantics.

**The completeness guard (apply from day 1):**

```typescript
// classify.test.ts — forces TypeScript error if any OapiChangeType
// is missing from the TYPE_STUBS map
const TYPE_STUBS: Record<OapiChangeType, [unknown, unknown]> = {
  "endpoint-removed":                       ["/a", null],
  "parameter-type-changed":                 ["string", "integer"],
  // ... one entry per OapiChangeType value
  "parameter-items-constraint-changed":     [3, 10],
};
// runtime test: verify none produces the fallback message
for (const [type, [before, after]] of Object.entries(TYPE_STUBS)) {
  const [change] = classifyChanges([{type, path: "/t", method: "get",
    location: "test", before, after}]);
  expect(change?.message).not.toMatch(/^Change detected at/);
}
```

Add a TYPE_STUBS entry the moment you add a new `OapiChangeType`. TypeScript
will refuse to compile if you forget one. This catches silent fallthrough
before any integration test.

---

## Direction-aware classification polarity

Request and response have **opposite semantics**. Memorize this:

| Direction | Tightening | Loosening |
|---|---|---|
| **Request** (client sends) | BREAKING — existing clients rejected | INFO |
| **Response** (server sends) | INFO | BREAKING — clients that relied on constraints/specificity break |

Concretely:
- `minLength: 0 → 5` on a **request** field = BREAKING (existing clients sending short strings now rejected)
- `minLength: 5 → 0` on a **request** field = INFO (server accepts more)
- `minLength: 0 → 5` on a **response** field = INFO (server guarantees longer strings — stricter contract)
- `minLength: 5 → 0` on a **response** field = BREAKING (clients expecting guaranteed minimum length break)

For `maxItems`:
- Request maxItems decreased = BREAKING; Response maxItems **increased** = BREAKING (server can now send more)

For `enum`:
- Request: **values removed** = BREAKING (client's current input rejected)
- Response: **values added** = BREAKING (client's exhaustive switch/if now hits unhandled case)

For `nullable`:
- Request nullable `true → false` = BREAKING (client sending null now rejected)
- Response nullable `false → true` = BREAKING (client assuming non-null now crashes on null)

**nullable polarity trap (round 26):** The above is the CORRECT direction. A previous 25-round
implementation had it INVERTED at the top-level body schema level while property and items
levels were correct all along. The trap: "response became non-nullable (true→false) = server
is tightening the guarantee" sounds alarming ("changed!") but it's SAFE for clients. The
BREAKING case is the server announcing it MAY return null (false→true) — clients that relied
on non-null will crash. Apply this sanity check to every nullable rule: "would a well-written
client break if the server sends null when it previously guaranteed non-null?" If yes = BREAKING.
"Would a well-written client break if the server stops sending null?" — no, the client's null
check is now dead code = INFO.

For `pattern`:
- Always BREAKING in both directions (pattern changes alter what values are valid/invalid)

For `format`:
- Always BREAKING in both directions (format change alters interpretation/validation)

For `type`:
- Always BREAKING (type mismatch breaks the client regardless of direction)

---

## The `?? null` sentinel — never use `?? undefined`

When comparing two values that may be undefined:

```typescript
// WRONG: undefined === undefined is always true even when both sides
// had a value in their respective specs that the other side lacked
const bVal = baseline?.minLength;   // could be 0 (falsy!) or undefined
const cVal = current?.minLength;
if (bVal !== cVal) { ... }  // 0 === undefined → false: BUG

// CORRECT: treat absence as null; preserves 0 as a real value
const bVal = baseline?.minLength ?? null;
const cVal = current?.minLength ?? null;
if (bVal !== cVal) { ... }
```

Zero (`0`) is a valid constraint value. `undefined ?? null` correctly becomes
`null`; `0 ?? null` correctly stays `0`. This distinction matters for
`minLength: 0` (valid: accept empty string) vs absent minLength (no constraint).

---

## allOf flattening — always inherit all fields

`flattenAllOf` merges allOf members into the parent schema. When you add new
fields to `OapiSchema`, you MUST add them to `flattenAllOf` as well:

```typescript
// flattenAllOf after adding new fields — keep this list comprehensive
const numericConstraints = [
  "minimum", "maximum", "minLength", "maxLength", "minItems", "maxItems"
] as const;
for (const cf of numericConstraints) {
  if (result[cf] === undefined && member[cf] !== undefined)
    result[cf] = member[cf];
}
if (result.pattern === undefined && member.pattern !== undefined)
  result.pattern = member.pattern;
// ... similarly for readOnly, writeOnly, format, nullable, type, items, enum
```

The pattern and string/boolean fields can't be looped the same way as
numerics (TypeScript type narrowing), so handle them separately.

A constraint change in an allOf base component schema is the most common
real-world breaking change. Failing to inherit the field makes it invisible.

---

## Top-level body schema vs per-property fields

These are different code paths:

- **Per-property**: `diffSchemaProperties` loops over `schema.properties[k]`
  and compares each property's type, format, enum, nullable, readOnly,
  writeOnly, constraints, items.
- **Top-level body schema**: the request body or response schema ITSELF
  (e.g., a string scalar body, or the array root before entering items).
  Must have separate helpers: `diffSchemaTopLevelConstraints`,
  `diffSchemaTopLevelFields`.

Both `diffRequestBody` and `diffResponses` must call BOTH sets of helpers.
It is easy to add per-property coverage and forget the top-level body.

---

## Recursion: items inside properties + items inside parameters

Two recurring gaps that each required a dedicated round:

1. **Array-typed property items**: A property `user.tags: {type: array,
   items: {type: string}}` has `bProp.items`. Call `diffSchemaItems` inside
   the `diffSchemaProperties` loop guarded by `bProp.items || cProp.items`.

2. **items inside diffSchemaItems**: `diffSchemaItems` handles the `items`
   schema. But `items` can itself be an object with `properties` and
   `required`. Call `diffSchemaProperties(depth=0)` + `diffSchemaRequiredFields`
   from `diffSchemaItems` when `properties`/`required` are present.

3. **Parameter items**: array-type parameters have `schema.items`. Add a
   constraint loop plus type/format/enum/nullable comparisons after the
   main parameter comparison loop.

The `MAX_PROPERTY_DEPTH = 5` guard in `diffSchemaProperties` prevents infinite
recursion. The `visited` set in the parser prevents infinite `$ref` loops.

---

## The field-coverage matrix (Phase 0 completeness checkpoint)

Before closing Phase 0, verify every cell is covered at every level:

| Field | Top-level body | Per-property | Items | Parameter | Param.items |
|---|---|---|---|---|---|
| type | ✓ | ✓ | ✓ | ✓ | ✓ |
| format | ✓ | ✓ | ✓ | ✓ | ✓ |
| nullable | ✓ | ✓ | ✓ | ✓ | ✓ |
| enum | ✓ | ✓ | ✓ | ✓ | ✓ |
| required[] | ✓ | ✓ (nested) | ✓ (via recursion) | n/a | n/a |
| properties | ✓ | ✓ (recursive) | ✓ (via recursion) | n/a | n/a |
| items | ✓ | ✓ | ✓ (recursive) | ✓ | ✓ |
| minimum/maximum | ✓ | ✓ | ✓ | ✓ | ✓ |
| minLength/maxLength | ✓ | ✓ | ✓ | ✓ | ✓ |
| minItems/maxItems | ✓ | ✓ | ✓ | ✓ | ✓ |
| minProperties/maxProperties | ✓ | ✓ | ✓ | ✓ | ✓ |
| pattern | ✓ | ✓ | ✓ | ✓ | ✓ |
| readOnly | ✓ (round 24) | ✓ | ✓ | n/a | n/a |
| writeOnly | ✓ (round 24) | ✓ | ✓ | n/a | n/a |
| additionalProperties | ✓ | ✓ | ✓ | Phase 2 | Phase 2 |
| deprecated | n/a | n/a | n/a | ✓ | n/a |

Phase 2 gaps (explicitly out of scope for Phase 0): oneOf/anyOf composition,
remote $ref, uniqueItems, default, exclusiveMinimum/Maximum, multipleOf,
media-type coverage, response headers, security scheme changes, servers array.

---

## The "parsed-but-never-diffed" audit protocol

Run this after every major feature addition:

1. List every field in `OapiSchema` (types.ts)
2. For each field, grep `parser.ts` — is it extracted?
3. For each extracted field, grep `diff.ts` — is it compared?
4. For each compared field, grep `classify.ts` — does it have a classify rule?
5. For each classify rule, grep `classify.test.ts` — is there a TYPE_STUBS entry?
6. For each classify rule, verify the direction-aware polarity is correct.

Phase 0 needed 8 rounds of this audit. Future builds can skip to the matrix
at the start: fill every empty cell before closing.

---

## Test count trajectory (reference)

Phase 0 started at 68 tests and reached 345. Each major gap required:
- 2–6 new OapiChangeType values
- 2–8 new classify rules
- 1–4 new TYPE_STUBS entries
- 3–15 new tests (unit + integration + adversarial)

The 5.7.2 escalating critique pattern — run the full panel clean, then
immediately re-run with the explicit assumption something was missed —
reliably found 1–3 architectural gaps per round. Budget 3–5 adversarial
rounds per major feature, not 1.

---

## Rule-ordering convention in classify.ts

Rules are evaluated in order; the first match wins. Convention:
1. Type-specific rules first (exact before/after values, strict conditions)
2. Direction-agnostic rules second (pattern match by change type only)
3. Fallback (INFO + generic message) last

Always add new rules above the fallback. Document the ordering invariant
in a comment so future editors don't break it silently.

---

## Enum comparison must be order-insensitive (round 19)

`deepEqual` uses `JSON.stringify`, which is order-sensitive for arrays:
`["a","b"] ≠ ["b","a"]` even though both represent the same set of allowed
values. Use `enumSetsEqual()`:

```typescript
function enumSetsEqual(a: unknown[] | undefined, b: unknown[] | undefined): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  if (a.length !== b.length) return false;
  const aSet = new Set(a.map((v) => JSON.stringify(v)));
  return b.every((v) => aSet.has(JSON.stringify(v)));
}
```

Apply at all 5 enum comparison sites: parameter schema, parameter items,
property-level, items-level, top-level body.

A spec that merely reorders its enum values (common in auto-generated specs)
should produce zero diff events.

---

## The sub-schema entity guard pattern (rounds 20-22)

When comparing sub-fields of a nested entity (e.g., `items.format`,
`items.enum`), guard ALL scalar field comparisons with
`if (bEntity && cEntity)`. Without this, a newly-added entity
(`baseline=undefined, current={...}`) emits spurious field-changed events
alongside the entity-type-changed event.

**Correct structure for diffSchemaItems:**

```typescript
// type comparison STAYS OUTSIDE (primary detection for newly-added/removed items):
const bType = bItems?.type ?? null;
const cType = cItems?.type ?? null;
if (bType !== cType) { /* emit type-changed */ }

// ALL scalar field comparisons INSIDE the guard:
if (bItems && cItems) {
  // format, enum, nullable, constraints, additionalProperties, readOnly, writeOnly
  if (bFmt !== cFmt) { /* emit format-changed */ }
  // ... etc
}

// Recursion into nested schemas stays outside (nested changes are independent):
if (bItems?.properties || cItems?.properties) {
  diffSchemaProperties(...);
}
```

The type comparison is the "primary detector" for the entity's existence/non-existence.
The scalar comparisons are "detail events" that only make sense when both entities exist.

**Apply this pattern to every sub-schema entity**: items, parameter.schema.items,
property.items. Every diff function with a "sub-entity" block needs this guard.

---

## Constraint direction lookup table (self-improvement #13B)

The classify.ts constraint rules used to repeat `loc.endsWith(".minimum") || ...`
across 6 rules. This is fragile when adding new constraint fields. Use the lookup table:

```typescript
const MIN_SENSE_FIELDS = new Set(["minimum", "minLength", "minItems", "minProperties"]);
const MAX_SENSE_FIELDS = new Set(["maximum", "maxLength", "maxItems", "maxProperties"]);

type ConstraintKind = "min-sense" | "max-sense" | "pattern" | "other";

function constraintKind(loc: string): ConstraintKind {
  const field = loc.split(".").pop() ?? "";
  if (field === "pattern") return "pattern";
  if (MIN_SENSE_FIELDS.has(field)) return "min-sense";
  if (MAX_SENSE_FIELDS.has(field)) return "max-sense";
  return "other";
}
```

**Direction semantics**:
- `min-sense`: higher value = tighter constraint; request tightening = BREAKING
- `max-sense`: lower value = tighter constraint; request tightening = BREAKING
- `pattern`: any change = BREAKING for request; removal = INFO for request; addition = INFO for response
- `other`: unknown field — default INFO

Adding a new constraint field (e.g., `uniqueItems`) requires only:
1. Adding the field to `OapiSchema`
2. Adding it to `MIN_SENSE_FIELDS` or `MAX_SENSE_FIELDS` (or add "boolean-sense" logic)
3. Adding the field to all constraint field arrays in diff.ts
4. Adding the parser extraction
5. Adding to flattenAllOf's numeric constraint loop

The classify rules themselves need no changes.

---

## Kitchen-sink field coverage test (self-improvement #13A)

After Phase 0 found readOnly/writeOnly (round 24) and minProperties/maxProperties
(round 25) missing from the diff functions despite being in OapiSchema, add a
parametric field-coverage test in diff.test.ts:

```typescript
const FIELD_CASES = [
  { field: "type",    baseline: "type: string", current: "type: integer" },
  { field: "format",  baseline: "type: string\nformat: date", current: "type: string\nformat: date-time" },
  { field: "readOnly", baseline: "type: object\nreadOnly: false", current: "type: object\nreadOnly: true" },
  // ... one entry per OapiSchema body-level field
];

it.each(FIELD_CASES)("body schema field '$field' produces at least one change event", ({ ... }) => {
  const changes = diffSpecs(parseOapiSpec(makeSpec(baseline)), parseOapiSpec(makeSpec(current)));
  expect(changes.length).toBeGreaterThan(0);
});
```

Adding a new OapiSchema field requires adding to this list (CI fails if the field
is in OapiSchema but produces no change events). This catches "parsed-but-never-diffed"
gaps automatically.

---

## Test count trajectory (updated through Phase 0 rounds 1-25)

Phase 0 started at 68 tests and reached 517 (+449). Each major gap required:
- 0–4 new OapiChangeType values (shared constraint types need no new types)
- 2–8 new classify rules
- 0–4 new TYPE_STUBS entries
- 3–16 new tests (unit + integration + adversarial)

Notable rounds: round 16 (additionalProperties, +14 tests), round 17 (pattern
null-transitions, +16 tests), round 15 (request constraint removal, +27 tests),
round 3 (completeness guard + 6 new types, +70 tests). The 5.7.2 escalating
critique pattern continues to find 1–3 architectural gaps per round. Budget
3–5 adversarial rounds per major feature, not 1.

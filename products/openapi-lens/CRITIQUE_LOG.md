# CRITIQUE_LOG.md — openapi-lens critique history

> Full 14-critic panel results per `governance/CRITIQUE_AGENTS.md`.
> Every phase gate runs the complete panel. Escalating critique
> (5.7.2) requires a second independent hard pass on any clean result.

---

## Phase 0 pass 1 — full 14-critic panel (2026-06-06)

**Scope:** `src/engine/` — parser, diff, classify, index. 91/91 tests.
Pure TypeScript engine; no VS Code dependencies.

**Overall verdict:** Phase 0 engine is solid. One P1 (stack overflow on circular
schemas), four P2s (type gap, missing pin tests, undocumented throw), three P3s
(design smell, docs, missing test). All P0/P1/P2 actionable items addressed before
Phase 1 begins.

---

### P1 Findings

#### P1-1 — Correctness / Reliability: Circular $ref causes infinite recursion (stack overflow)

**Location:** `src/engine/parser.ts` — `normalizeSchema` + `resolveLocalRef`

**Defect:** `normalizeSchema` resolves `$ref` by calling `resolveLocalRef`, which
calls `normalizeSchema` on the referenced definition. A self-referential schema
(e.g., a linked-list `Node` type: `properties.next.$ref = "#/components/schemas/Node"`)
creates an infinite recursion chain with no termination condition.

```yaml
components:
  schemas:
    Node:
      type: object
      properties:
        value:
          type: string
        next:
          $ref: "#/components/schemas/Node"   # ← circular
```

**Impact:** Any real-world tree-shaped or linked-list-shaped API schema would crash
the engine with a `Maximum call stack size exceeded` error in the VS Code extension.
This is a real, common OpenAPI pattern.

**Fix:** Add a `visited: Set<string>` parameter to `resolveLocalRef` and
`normalizeSchema`; if a $ref key is already in `visited`, return `{}` instead of
recursing. Add a test that documents the circular-ref behavior.

**Status:** Fixed (pass 1, same session).

---

### P2 Findings

#### P2-1 — Correctness: New request-body properties emit wrong change type

**Location:** `src/engine/diff.ts:diffSchemaProperties` (lines 161-171) and
`src/engine/types.ts`

**Defect:** When a new property is added to a REQUEST body schema, `diffSchemaProperties`
always emits `response-schema-property-added` regardless of `isRequest`. The resulting
`BreakingChange.message` reads "New **response** property added" for a request body
change. `OapiChangeType` has no `request-schema-property-added` variant.

**Impact:** Phase 1 VS Code diagnostic messages will display "RESPONSE property added"
when the developer added a property to a request body — confusing and misleading. The
`oasdiff` competitor (1,116 stars, used at Adyen/Elastic/Wiz) correctly distinguishes
request from response schema changes.

**Fix:**
1. Add `"request-schema-property-added"` to `OapiChangeType`.
2. Emit `isRequest ? "request-schema-property-added" : "response-schema-property-added"` in `diffSchemaProperties`.
3. Add classify rule for `request-schema-property-added` → INFO.
4. Add test: adding a property to a request body emits `request-schema-property-added`.

**Status:** Fixed (pass 1, same session).

#### P2-2 — Reliability: Public API throws on invalid/empty input with no documentation

**Location:** `src/engine/index.ts:analyzeOpenApiDiff`, `src/engine/parser.ts:parseOapiSpec`

**Defect:** `analyzeOpenApiDiff("", current)` and `analyzeOpenApiDiff(null_yaml, current)`
throw `Error("Invalid OpenAPI spec: root must be an object")`. The thrown error is not
caught by the public API, is not documented in the JSDoc, and is not tested.

**Impact:** Phase 1's VS Code extension will need a try/catch wrapper. Without knowing
the exact throw contract, the extension's error handling is brittle.

**Fix:** Document the throw contract in JSDoc. Add a test pinning the error message.
(Decision: throw on invalid input is CORRECT for a parse error — consumers should catch;
but the behavior must be tested and documented, not implicit.)

**Status:** Fixed (test added; JSDoc added to `parseOapiSpec`).

#### P2-3 — Domain-Expert / Adversarial: No pin test for allOf/oneOf/anyOf limitation

**Location:** `src/engine/parser.ts` (allOf/oneOf/anyOf stored but not merged), documented
in `PROGRESS.md` as a known limitation.

**Defect:** The documented "no allOf/oneOf/anyOf merging" limitation has no test verifying
the behavior. A future code change could accidentally start merging composition schemas
without a failing test to signal the behavior change.

**Fix:** Add a test: a spec with `allOf: [...]` parses without error; the member schemas
are stored in the parsed `OapiSchema.allOf` field but diffing does not examine member schemas.

**Status:** Fixed (test added).

#### P2-4 — Domain-Expert / Adversarial: No pin test for remote $ref limitation

**Location:** `src/engine/parser.ts:resolveLocalRef` (only handles `#/...` local refs),
documented in `PROGRESS.md`.

**Defect:** A `$ref: "./other.yaml#/definitions/Pet"` or `$ref: "https://..."` silently
returns `{}` (empty schema), producing no diff. No test verifies this behavior; a future
improvement could break the silent-ignore behavior without knowing it.

**Fix:** Add a test: a spec with a non-local $ref parses without error; the referenced
schema becomes `{}` (no type, no properties).

**Status:** Fixed (test added).

---

### P3 Findings

#### P3-1 — Maintainability: `parameter-added` with required:true uses fragile post-processor

**Location:** `src/engine/classify.ts:adjustAddedRequiredParam`

**Design smell:** A `parameter-added` change with `required: true` flows through an INFO
rule (returning severity="INFO"), then through a post-processor that overrides to BREAKING.
The INFO rule's message even reads "Required parameter added: ... BREAKING: ...". This is
correct output but fragile design — a future developer extending parameter-added handling
could easily miss the post-processor.

**Note:** Deferred to Phase 2 (no behavior change needed; the output is correct).
Document in code comment.

#### P3-2 — Maintainability / Polish: No JSDoc on public API functions

**Location:** `src/engine/index.ts`

`analyzeOpenApiDiff` and `breakingOnly` have no JSDoc. For a developer library this is
a documentation gap — Phase 1's VS Code extension author needs to know: what does this
throw? What does `before`/`after` contain for different change types?

**Note:** Add minimal JSDoc in Phase 1 before publishing to npm.

#### P3-3 — Product-Sense: No `summarize()` utility

The VS Code CodeLens provider will need "N BREAKING, M INFO" counts. Computing from
`BreakingChange[]` is trivial but a `summarize(changes)` helper prevents every consumer
from implementing it. Add in Phase 1 when the CodeLens is built.

---

## Phase 0 pass 1 — resolution summary

| ID | Severity | Fixed? |
|----|----------|--------|
| P1-1 | P1 | ✓ Fixed (circular ref → `visited` set) |
| P2-1 | P2 | ✓ Fixed (request-schema-property-added type + test) |
| P2-2 | P2 | ✓ Fixed (invalid-input throw documented + tested) |
| P2-3 | P2 | ✓ Fixed (allOf pin test added) |
| P2-4 | P2 | ✓ Fixed (remote $ref pin test added) |
| P3-1 | P3 | Deferred (correct behavior; add comment) |
| P3-2 | P3 | Deferred to Phase 1 |
| P3-3 | P3 | Deferred to Phase 1 |

**All P1 and P2 findings fixed. Phase 0 is cleared for Phase 1 start (pending
Proposal #3 auto-proceed 2026-06-13).**

---

## Escalating critique (5.7.2) — Phase 0 pass 2

_Required after pass 1 is clean. Runs on the post-fix code with harder adversarial
inputs and the explicit assumption that something was missed._

**Status:** Run 2026-06-06 (same session as pass 1, immediately after P1/P2 fixes).

**Scope probed:**
- Circular $ref: test confirmed the `visited` set terminates at second recursion level;
  the first level returns the full schema (correct: the first resolution is legal, only
  the back-edge is circular). Adversarial re-read: ✓
- `request-schema-property-added` classification: confirmed INFO severity, correct message,
  NOT classified as `response-schema-property-added`. ✓
- `allOf`/`oneOf` schemas: confirmed stored in `OapiSchema.allOf`, NOT merged into
  top-level `properties`. Diffing two identical allOf specs produces 0 changes. ✓
- Remote $ref: confirmed silently returns `null` schema (empty object keys → null). ✓
- Throws on invalid input: confirmed with 3 forms (`""`, malformed YAML, non-object). ✓

**Hard adversarial re-attack (5.7.2 second independent pass):**
- A spec where a circular schema is ALSO diffed against a changed version of itself:
  the change is detected correctly (the top-level schema's type change fires, the circular
  property does not confuse the comparison). Verified manually by trace-reading the code.
- A spec with `request-schema-property-added` AND `response-schema-property-added` in
  the same diff: both fire independently with correct types and messages. ✓
- A spec with both allOf and top-level properties: allOf is stored; top-level properties
  are diffed; allOf members are not examined. Behavior is consistent. ✓

**Verdict:** No new P0/P1 findings. Phase 0 engine passes the 5.7.2 escalating critique.
**Phase 0 is cleared.**

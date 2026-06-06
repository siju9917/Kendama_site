# CRITIQUE_LOG.md — openapi-lens critique history

> Full 14-critic panel results per `governance/CRITIQUE_AGENTS.md`.
> Every phase gate runs the complete panel. Escalating critique
> (5.7.2) requires a second independent hard pass on any clean result.

---

## Phase 0 — 5.7.5 continuous bug-hunt (2026-06-06, post-panel)

**Pass type:** 5.7.5 continuous bug-hunt — new adversarial inputs invented AFTER the
Phase 0 critique panel passed. Scope: the complete engine with fresh attack angles.

**Critics run:** Correctness #1, Adversarial Tester #2, Domain-Expert #5.

**Finding (real, fixed same session):**

#### Bug-hunt-1 — Correctness: `$ref` parameters in `components/parameters` silently dropped

**Location:** `src/engine/parser.ts` — `parseParameter` + `parseParameters`

**Defect:** When a parameter is specified as a `$ref` (e.g., `- $ref: "#/components/parameters/limitParam"`),
`parseParameter` receives an object with no `name` or `in` keys. The `if (!name || !inVal) return null`
guard silently drops the parameter. A spec that uses `components/parameters` for shared parameters
(a common pattern in real-world APIs) produces **zero parameters** on those operations —
making the diff engine miss all additions, removals, and type changes for those parameters.

This affects:
- OAS 3.x `#/components/parameters/X`
- Swagger 2.0 `#/parameters/X` (top-level)
- Path-level parameter arrays containing `$ref` entries

**Impact:** High. Real-world APIs that DRY up shared parameters (e.g., pagination parameters
`limit`/`page`/`cursor`, path parameters shared across GET/PUT/DELETE on the same resource)
would produce entirely wrong diffs — parameter changes would be invisible.

**Fix:** Added `parseSharedParameters()` that builds a lookup from both `components/parameters`
(OAS 3.x) and top-level `parameters` (Swagger 2.0). Updated `parseParameter` to resolve `$ref`
against this lookup before falling through to inline parsing. Updated `parseParameters` and
`parseOperations` to thread the lookup through.

4 new tests:
- OAS 3.x `$ref` parameters resolved (2 parameters, correct types)
- Mixed `$ref` + inline parameters on same operation
- Unresolvable `$ref` → silently dropped (no crash, 0 parameters)
- Path-level `$ref` parameters resolved into all operations on the path

**Status:** Fixed (same session as found). **100/100 tests pass.**

**5.7.5 lesson:** The critique panel tested inline parameters exhaustively but did not probe
`$ref`-based parameters. Checklist addition for Adversarial Tester #2: "Test both inline and
`$ref`-based forms of any schema/parameter entity — `$ref` is the primary reuse mechanism
in real-world OpenAPI specs and is easily missed when tests only use inline forms."

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

---

## D5 Phase 1 + D6 Phase 1 — First critique pass (2026-06-06, build session)

**Phase scope:** VS Code extension scaffold (D5) + Terraform Lens classifier (D6).
Includes: `openApiDetector.ts`, `diagnosticProvider.ts`, `codeLensProvider.ts`,
`changeWebviewProvider.ts`, `extension.ts`, `baseline/gitBaseline.ts`,
`baseline/fileBaseline.ts`, `commands.ts`, `terraformExtension.ts`,
`terraform/{types,resources,classify,parser,webview}.ts`, and all their test suites.

**Critics run:** Full 14-critic panel.

**P1 Findings (found and fixed same session):**

#### D5-P1-1 — Correctness: SAFE changes passed to `buildDiagnostics`

The engine emits three severities: BREAKING, INFO, SAFE. Before this fix, ALL non-BREAKING
changes were mapped to `DiagnosticSeverity.Information`, including SAFE structural diffs
that don't affect API consumers (like description changes). This created spurious info
diagnostics cluttering the Problems panel with noise.

**Fix:** `extension.ts` filters `allChanges.filter((c) => c.severity !== "SAFE")` before
passing to `buildDiagnostics` and `codeLensProvider.update`. Both providers now see only
BREAKING and INFO changes.

**P2 Findings (found and fixed same session):**

#### D5-P2-1 — Design: Global baseline variable shared across all open specs

`manualBaselineContent` was a single `let` variable (module-level), shared across ALL open
OpenAPI files. Setting a baseline for `spec-v2.yaml` would affect the diff shown for
`spec-v3.yaml`. This is wrong — each file should have its own baseline.

**Fix:** Replaced with `Map<string, string>` keyed by `document.uri.toString()`. Selecting
a baseline now scopes to the active document. The map entry is cleaned up in
`onDidCloseTextDocument`.

#### D5-P2-2 — UX: "No changes detected" CodeLens when baseline is absent

When no baseline existed (git HEAD not available, no file configured), the CodeLens showed
"No changes detected" — a false negative that looks like success. Users would not know they
need to set a baseline.

**Fix:** Added `setNoBaseline()` method with a new `{ kind: "no-baseline" }` discriminated
union state. When baseline is null, CodeLens shows "Set baseline to enable diff" with
command `openapi-lens.selectBaseline` — directly actionable.

#### D5-P2-3 — Interface: `onBaselineSelected` had unused `label` parameter

**Fix:** Removed `label` from the `CommandContext` interface and call site.

**Verdict (pass 1):** All P1 and P2 findings fixed within the same session. No P0 findings.

---

## D5 Phase 1 + D6 Phase 1 — Escalating critique pass 5.7.2 (2026-06-06, post-compaction)

**Pass type:** 5.7.2 second independent hard pass — explicit assumption that something was
missed. Scope: full extension code + terraform classifier after P1/P2 fixes.

**Critics run:** All 14 critics with adversarial inputs.

**New findings discovered in this pass:**

#### D6-EC-1 (P1 — Correctness): Data source "read" actions misclassified as CRITICAL

**Location:** `terraform/parser.ts` — `isResourceChange` filter

**Defect:** Terraform plan JSON files include both managed resources (mode: "managed") and
data sources (mode: "data") in the `resource_changes` array. Data sources have
`actions: ["read"]` — they are read-only refreshes of external state, not infrastructure
modifications. The `isResourceChange` filter had no check for `mode`, so data sources were
included in classification. For a data source whose `type` is a DATA_STORE_TYPE (e.g.,
`data.aws_s3_bucket.artifacts` with `type: "aws_s3_bucket"`):
- `isNoOp(["read"])` → false (not "no-op") → no early return
- `isDataStoreType("aws_s3_bucket") && !isCreateOnly(["read"])` → **true** → severity = CRITICAL

A plan containing a data source read on any S3 bucket, RDS instance, DynamoDB table, or
other data store type would incorrectly show CRITICAL findings for benign state refreshes.

**Fix:** Added `if (r["mode"] === "data") return false;` as the first check in
`isResourceChange`. Data sources are categorically excluded from classification.

**Tests added:** 4 new adversarial tests in `adversarial.test.ts` — data source on
data-store type, data source on IAM type, mixed plan (managed + data), mode-absent entry
still included. **693→697 tests.**

#### D5-EC-2 (P2 — Correctness): `selectBaseline` command clears `baselineFile` workspace setting

**Location:** `commands.ts` — `openapi-lens.selectBaseline` handler

**Defect:** After calling `pickBaselineFile()` and getting the content, the handler called:
```typescript
await config.update("baselineFile", "", vscode.ConfigurationTarget.Workspace);
```
This CLEARS the `baselineFile` workspace setting. If a user had carefully configured
`openapi-lens.baselineFile` to a stable path in their workspace settings, running
`selectBaseline` (via picker) would silently delete that configuration. The comment said
"Persist the choice" but the code did the opposite.

**Fix:** Removed the `config.update` call entirely. The in-memory per-document baseline
(`manualBaselineByUri`) is set correctly; workspace settings are not touched.

#### D6-EC-3 (P2 — Reliability): `openapi-lens.showTerraformPanel` command referenced but never registered

**Location:** `terraformExtension.ts` — `updateStatusBar`

**Defect:** `statusBarItem.command = "openapi-lens.showTerraformPanel"` sets the status bar
button's command, but this command was never registered with VS Code. Clicking the status
bar button would produce a VS Code error: "command 'openapi-lens.showTerraformPanel' not
found." The Terraform panel was auto-shown on active editor switch, but there was no way
to re-open it after the user closed it (which is the primary use case for the status bar
button).

**Fix:** Added `lastKnownSummary` and `lastKnownPlanUri` module-level variables.
Registered `openapi-lens.showTerraformPanel` in `activateTerraformSupport`:
```typescript
context.subscriptions.push(
  vscode.commands.registerCommand("openapi-lens.showTerraformPanel", () => {
    if (lastKnownSummary && lastKnownPlanUri) {
      showWebviewPanel(lastKnownSummary, lastKnownPlanUri);
    }
  }),
);
```
Both variables are cleared in `deactivateTerraformSupport()`.

#### D5-EC-4 (P3 — Robustness): Diagnostic range start column may be -1 for empty fallback lines

**Location:** `diagnosticProvider.ts` — `buildDiagnostics`

**Defect:** `lineText.search(/\S/)` returns -1 if the line is entirely whitespace.
For the fallback case (line 0), if line 0 is an empty line, `new vscode.Range(0, -1, 0, 0)`
would be created. VS Code typically clamps this but the behavior is undefined.

**Fix:** `Math.max(0, lineText.search(/\S/))` clamps the start column.

**Post-fix state:** 697/697 tests pass. Typecheck clean (both engine and extension tsconfigs).

**5.7.2 verdict:** 4 findings (1×P1, 2×P2, 1×P3) found and fixed. All fixed within same pass.
A third clean independent re-read is warranted per 5.7.2 ("clean pass is a hypothesis to attack").

---

## D5 Phase 1 + D6 Phase 1 — Hard second re-attack (5.7.2 confirmation pass)

**Mandate:** After the first escalating pass found real bugs, a second clean independent
hard pass is required before the phase is declared clear.

**Adversarial angles probed (fresh, not from the fix checklist):**

1. **`classifyChange` rule interaction with `isDataStoreType` + `isIamOrSecurityType` overlap:**
   A resource type that is BOTH a data store AND (hypothetically) in the IAM list would
   generate two CRITICAL reasons. Verified: DATA_STORE_TYPES and IAM_TYPES have no overlap
   (data stores are DBS/storage; IAM_TYPES are policy/role/sg resources). No collision. ✓

2. **`hasReplacePattern` on empty actions array:** `classifyChange` receives `actions: []`.
   `isNoOp([])` → `[].length > 0` → false → no early return. Rule 2: `[].includes("delete")`
   → false. Rule 3: `hasReplacePattern([])` → false. Rule 4: `!isCreateOnly([])` → true for
   data stores → CRITICAL severity set. Rule 5: IAM types similarly. Default: `isCreateOnly([])`
   → false; severity=CRITICAL from rule 4/5 or NORMAL (no rules fired). For a plain
   `aws_instance` with `actions: []`: severity stays NORMAL (no rules fire), reasons empty,
   but returns `{ severity: "NORMAL", reasons: [] }`. This is a degenerate input (Terraform
   never emits empty actions arrays) but the behavior is: silently returns NORMAL. Acceptable
   for Phase 1; the parser only accepts valid-structure entries, and empty-actions plans don't
   occur in practice. Documented as a known edge case, not a P1.

3. **Template-literal XSS audit (`esc()` completeness):** Grep `${` in both webview files:
   - `terraform/webview.ts`: 8 interpolation sites — `esc(summary.terraformVersion)`,
     `esc(c.change.address)`, `esc(c.change.type)`, `esc(c.change.actions.join(", "))`,
     `esc(r)` (each reason), `c.severity.toLowerCase()` (TypeScript union — hardcoded
     constant, no user data). Hardcoded counts and lengths are numeric literals. All ✓
   - `extension/providers/changeWebviewProvider.ts`: 5 interpolation sites — `esc(change.path)`,
     `esc(change.method)`, `esc(change.message)`, `esc(change.location)`, badge HTML
     (hardcoded string). All ✓
   No unescaped user-data interpolation found. ✓

4. **`deactivateTerraformSupport` completeness after Bug 3 fix:** The new `lastKnownSummary`
   and `lastKnownPlanUri` variables are cleared to `undefined` in `deactivateTerraformSupport`.
   Verified: yes, both lines were added in the fix. ✓

5. **`resolveBaseline` race: two `analyzeDocument` calls interleaved for same document:**
   If the user saves rapidly, two concurrent `analyzeDocument` calls may both call
   `resolveBaseline` simultaneously. `manualBaselineByUri.get()` is synchronous and reads
   the same Map — both reads would succeed identically. `fetchGitHeadContent` is async;
   two concurrent calls to `repo.show("HEAD", relPath)` for the same file would both
   succeed and return the same content. The two `codeLensProvider.update()` calls fire in
   an unspecified order but both carry correct data. This is harmless (no state corruption).
   The VS Code extension host is single-threaded (Node.js event loop), so concurrent
   awaits interleave between await points only. ✓

6. **`findLineForLocation` with numeric array index in location string:** Input
   `"paths./users.get.parameters[0]"`. Split: `["paths", "/users", "get", "parameters", "0"]`.
   Search starts at depth=4 looking for `0:` or `"0":` in YAML/JSON — unlikely to match.
   Falls to depth=3 (`parameters:`), then depth=2 (`get:`), etc. Falls back to line 0.
   This is correct and expected behavior for the heuristic — line 0 fallback is the
   documented behavior. ✓

**Verdict:** No new P0/P1 findings. Second independent hard pass confirms clean.
**D5 Phase 1 + D6 Phase 1 are cleared. Phase gate passed.**

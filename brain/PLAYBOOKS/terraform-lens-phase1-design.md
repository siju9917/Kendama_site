# DESIGN: terraform-lens Phase 1 — VS Code Extension Scaffold

> Pre-design written 2026-06-06 (ahead of the 2026-06-13 Proposal #4 auto-proceed).
> D6 (Terraform Plan Destructive-Change Classifier) builds AFTER D5 ships.
> This document specifies Phase 1 architecture so the first build session starts
> from decisions, not discovery. D6 reuses D5's VS Code extension shell.

---

## Why D6 is simpler than D5 architecturally

D5 (OpenAPI) required:
- A two-document diff (baseline vs current)
- Line number mapping from diff results back to source positions
- Baseline management (git HEAD or user-selected file)
- Activation triggered by file type + content heuristic

D6 (Terraform plan) needs NONE of these complexities:
- The plan JSON IS the comparison — it already has `before` + `after` embedded
- No line mapping — the plan is a generated file, not hand-edited YAML
- No baseline — the plan file itself contains the "what will change" information
- Activation: triggered by recognizing a file as a terraform plan JSON

D6's primary engineering challenge is the **classification ruleset** (which resource
types + which change patterns = CRITICAL/NORMAL), not the diff machinery.

---

## Goals and scope

Phase 1 ships a VS Code extension that:

1. Activates when a file is detected as a terraform plan JSON
2. Parses the plan JSON using our own TypeScript plan parser
3. Classifies each resource change as CRITICAL or NORMAL
4. Opens a WebView panel automatically showing the classification
5. Shows a status bar item with the CRITICAL count

Phase 1 does NOT include: inline diagnostics in the plan file (plans are generated,
not edited), CodeLens, monetization, multi-plan comparison. Those are Phase 2.

---

## Architecture

### File layout

```
products/openapi-lens/           ← D5 and D6 share the same product root
├── src/
│   ├── engine/                  ← Phase 0 openapi engine (complete)
│   ├── extension/               ← D5 Phase 1 (VS Code extension wiring)
│   └── terraform/               ← D6 Phase 1 (new)
│       ├── types.ts             ← TfPlan, TfChange, TfClassification
│       ├── parser.ts            ← parseTerraformPlan(json: string): TfPlan
│       ├── classify.ts          ← classifyPlan(plan: TfPlan): TfClassification[]
│       ├── resources.ts         ← data-driven resource type categories
│       └── webview.ts           ← createPlanWebviewContent(result): string
```

Note: D6 lives in the SAME VS Code extension as D5 (the "Breaking-Change Lens" product
line concept) — two format packs in one extension. Phase 1 of D6 ships as a version
bump to the existing extension, adding terraform plan support alongside OpenAPI support.

### Key invariant (same as D5)

**The terraform engine (`src/terraform/`) NEVER imports from VS Code.** All logic
lives in pure TypeScript, tested with Vitest. The extension wires VS Code APIs to the
classifier. Tests run without VS Code.

---

## The terraform plan JSON schema

`terraform show -json` produces a stable JSON schema since Terraform 0.12.
The relevant fields:

```typescript
interface TfPlanRoot {
  resource_changes: TfResourceChange[];
  output_changes: Record<string, TfOutputChange>;
  terraform_version: string;
  format_version: string;   // always "1.0" since 0.14
}

interface TfResourceChange {
  address: string;          // "aws_instance.web"
  type: string;             // "aws_instance"
  name: string;             // "web"
  change: {
    actions: ('no-op' | 'create' | 'update' | 'delete' | 'replace')[];
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    after_unknown: Record<string, unknown>;  // fields computed at apply time
  };
}
```

Key invariant: `actions: ['delete', 'create']` means REPLACE (delete + re-create,
NOT in-place update). This is the most common source of critical surprises.

---

## module: `types.ts`

```typescript
export type TfActionSet = string[];  // e.g., ['delete', 'create']

export interface TfChange {
  address: string;          // resource address ("aws_s3_bucket.data")
  type: string;             // resource type ("aws_s3_bucket")
  actions: TfActionSet;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export type TfSeverity = 'CRITICAL' | 'NORMAL' | 'NO-OP';

export interface TfClassification {
  change: TfChange;
  severity: TfSeverity;
  reasons: string[];        // human-readable why it's CRITICAL/NORMAL
}

export interface TfPlanSummary {
  changes: TfClassification[];
  critical: number;
  normal: number;
  noOp: number;
  terraformVersion: string;
}
```

---

## module: `resources.ts`

Data-driven resource category tables — mirrors BidDiff's `CRITICAL_RULES` data-driven
design. Each category maps resource type prefixes to their risk profile.

```typescript
// Resources where ANY update is CRITICAL (data stores, stateful infra)
export const DATA_STORE_TYPES = [
  'aws_db_instance',          // RDS databases
  'aws_rds_cluster',
  'aws_dynamodb_table',
  'aws_elasticache_cluster',
  'aws_s3_bucket',            // bucket itself (not objects)
  'aws_efs_file_system',
  'aws_fsx_',                 // all FSx types (prefix match)
  'google_sql_database_instance',
  'google_spanner_instance',
  'azurerm_sql_server',
  'azurerm_cosmosdb_account',
] as const;

// Resources where IAM/security changes widen access (must check before/after)
export const IAM_TYPES = [
  'aws_iam_role',
  'aws_iam_policy',
  'aws_iam_role_policy',
  'aws_iam_role_policy_attachment',
  'aws_security_group',
  'aws_security_group_rule',
  'aws_vpc_security_group_ingress_rule',
  'aws_vpc_security_group_egress_rule',
  'google_iam_binding',
  'google_iam_member',
  'google_iam_policy',
  'azurerm_role_assignment',
  'azurerm_key_vault_access_policy',
] as const;

// Resources where replacement is always CRITICAL
export const REPLACEMENT_CRITICAL_TYPES = [
  // Most resources in the category above are also here,
  // but some compute resources (EC2 instances) are NORMAL on replace
  // while database resources are always CRITICAL.
  // This drives the severity adjustment: if replace + data_store → CRITICAL.
  // If replace + stateless_compute → NORMAL unless user-configured.
] as const;
```

---

## module: `classify.ts`

```typescript
import { TfChange, TfClassification, TfSeverity } from './types';
import { DATA_STORE_TYPES, IAM_TYPES } from './resources';

export function classifyChange(c: TfChange): TfClassification {
  const reasons: string[] = [];
  let severity: TfSeverity = 'NORMAL';

  const actions = c.actions;

  // Rule 1: no-op
  if (actions.every(a => a === 'no-op')) {
    return { change: c, severity: 'NO-OP', reasons: [] };
  }

  // Rule 2: any delete or replace → CRITICAL
  if (actions.includes('delete') || hasReplacePattern(actions)) {
    severity = 'CRITICAL';
    reasons.push(
      hasReplacePattern(actions)
        ? `${c.address} will be REPLACED (deleted and re-created) — downtime likely.`
        : `${c.address} will be DELETED permanently.`
    );
  }

  // Rule 3: data store with any change (update or replace) → CRITICAL
  if (isDataStore(c.type) && !actions.every(a => a === 'no-op' || a === 'create')) {
    severity = 'CRITICAL';
    reasons.push(`${c.address} is a data store — any modification or deletion is CRITICAL.`);
  }

  // Rule 4: IAM/security-group change that widens access → CRITICAL
  if (isIamOrSecurityGroup(c.type) && isWideningChange(c.before, c.after)) {
    severity = 'CRITICAL';
    reasons.push(`${c.address}: IAM or security group change may widen access permissions.`);
  }

  // Rule 5: create is NORMAL (new resource, no existing state)
  if (actions.every(a => a === 'create') && severity === 'NORMAL') {
    reasons.push(`${c.address} will be created (new resource).`);
  }

  // Default NORMAL reason if no CRITICAL found
  if (severity === 'NORMAL' && reasons.length === 0) {
    reasons.push(`${c.address}: in-place attribute update (${actions.join(', ')}).`);
  }

  return { change: c, severity, reasons };
}

function hasReplacePattern(actions: string[]): boolean {
  // Terraform 0.15+ uses single 'replace' action
  // Earlier versions: ['delete', 'create'] (order matters for create_before_destroy)
  return actions.includes('replace') ||
    (actions.includes('delete') && actions.includes('create'));
}

function isDataStore(type: string): boolean {
  return DATA_STORE_TYPES.some(t =>
    type === t || (t.endsWith('_') && type.startsWith(t))
  );
}

function isIamOrSecurityGroup(type: string): boolean {
  return IAM_TYPES.some(t => type === t || type.startsWith(t));
}

function isWideningChange(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): boolean {
  // Phase 1: conservative heuristic — any IAM/SG change is flagged.
  // Phase 2: deep analysis of before/after policy documents.
  if (!before || !after) return true;   // can't tell → flag
  return true;  // Phase 1: flag ALL IAM/SG changes; refine in Phase 2
}
```

---

## module: `parser.ts`

```typescript
import { TfChange, TfPlanSummary } from './types';
import { classifyChange } from './classify';

export function parseTerraformPlan(json: string): TfPlanSummary {
  let plan: Record<string, unknown>;
  try {
    plan = JSON.parse(json);
  } catch {
    throw new Error('Invalid terraform plan: JSON parse failed');
  }

  if (!Array.isArray(plan['resource_changes'])) {
    throw new Error('Invalid terraform plan: missing resource_changes array');
  }

  const changes: TfChange[] = (plan['resource_changes'] as unknown[])
    .filter(isResourceChange)
    .map(r => ({
      address: String(r.address),
      type: String(r.type),
      name: String(r.name),
      actions: (r.change as { actions: string[] }).actions,
      before: (r.change as { before: Record<string, unknown> | null }).before,
      after: (r.change as { after: Record<string, unknown> | null }).after,
    }));

  const classified = changes.map(classifyChange);
  const critical = classified.filter(c => c.severity === 'CRITICAL').length;
  const normal = classified.filter(c => c.severity === 'NORMAL').length;
  const noOp = classified.filter(c => c.severity === 'NO-OP').length;

  return {
    changes: classified,
    critical,
    normal,
    noOp,
    terraformVersion: String(plan['terraform_version'] ?? 'unknown'),
  };
}

function isResourceChange(x: unknown): x is {
  address: unknown; type: unknown; name: unknown;
  change: { actions: string[]; before: unknown; after: unknown };
} {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return typeof r['address'] === 'string' &&
    typeof r['type'] === 'string' &&
    r['change'] !== null && typeof r['change'] === 'object' &&
    Array.isArray((r['change'] as Record<string, unknown>)['actions']);
}
```

---

## Extension activation (D6 additions to extension.ts)

D6 is detected by file content: a JSON file whose top-level keys include
`resource_changes` and `format_version`.

```typescript
function isTerraformPlanDocument(doc: vscode.TextDocument): boolean {
  if (doc.languageId !== 'json') return false;
  const first300 = doc.getText(new vscode.Range(0, 0, 15, 0));
  return first300.includes('"resource_changes"') &&
    (first300.includes('"format_version"') || first300.includes('"terraform_version"'));
}
```

On activation for a terraform plan:
1. Parse the plan JSON
2. Classify all resource changes
3. Open a WebView panel beside the editor showing CRITICAL/NORMAL table
4. Update status bar with "🔴 3 CRITICAL · 5 NORMAL" count

No `onDidSaveTextDocument` needed — plans are not edited in VS Code; they're generated
by `terraform show -json`. Activation happens once on file open.

---

## Phase 1 test plan

Target: ~50 new tests across the terraform engine modules.

| Module | Test cases | Count |
|---|---|---|
| `parser.ts` | valid plan, missing resource_changes, invalid JSON, zero changes, mixed actions | 8 |
| `classify.ts` | delete→CRITICAL, replace→CRITICAL, data-store-update→CRITICAL, IAM-change→CRITICAL, create→NORMAL, no-op→NO-OP, update-stateless→NORMAL | 10 |
| `resources.ts` | data-store type matching, IAM type matching, prefix matching, edge cases | 8 |
| `detector` | plan JSON detection, non-plan JSON, non-JSON file | 5 |
| integration | full pipeline valid plan, mixed severity plan, empty plan, malformed plan | 6 |
| adversarial | `actions: ['create', 'delete']` edge (CDN), nested IAM policy, replace on non-data-store | 5 |
| **Total new D6 tests** | | **~42** |

Phase 1 D6 target: 345 (Phase 0 openapi) + 31 (D5 Phase 1) + 42 = **~418 tests**.

---

## Phase 1 completion gate (D6)

1. All D6 module unit tests green (~418 total)
2. Terraform plan JSON correctly parsed on a real `terraform show -json` output
3. CRITICAL/NORMAL classification matches expected for: replace, delete, IAM change, data store, create, no-op
4. WebView panel opens automatically on plan.json file open
5. Status bar shows correct CRITICAL count
6. No crash on malformed JSON, missing `resource_changes`, or non-plan JSON files
7. Typecheck clean

---

## Known Phase 1 limitations

- **IAM widening is conservative**: any IAM/security-group change is flagged CRITICAL
  regardless of before/after direction. A rule that ADDS a `Deny` is not widening,
  but Phase 1 flags it. Phase 2 does before/after policy document analysis.
- **No support for `terraform plan -out` binary format.** Only `terraform show -json`
  output (which is the JSON representation) is supported. Document this prominently.
- **No `output_changes` or `variable_changes` classified.** Phase 2.
- **No provider-specific heuristics.** All cloud providers use the same generic rules.
  A Phase 2 AWS-specific module adds RDS-parameter-group replacement detection,
  security-group ingress-direction analysis, etc.
- **replace action semantics**: `create_before_destroy` vs `destroy_before_create`
  have different blast radii (the former keeps old resource alive during transition).
  Phase 1 flags both as CRITICAL; Phase 2 distinguishes.

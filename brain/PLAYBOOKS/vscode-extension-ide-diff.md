# PLAYBOOK — VS Code Extension "IDE diff classifier" products

> Written 2026-06-06 for D5 (VS Code OpenAPI Breaking-Change Lens) and D6
> (VS Code Terraform Plan Destructive-Change Classifier), both scored
> CONDITIONAL PROCEED (636 and 641/1000 respectively). Codifies the VS Code
> extension platform patterns so the first build session starts with
> accumulated knowledge, not a blank slate.

This playbook covers:
**(A)** VS Code extension anatomy and critical lifecycle patterns,
**(B)** the three UI primitives used by IDE diff classifiers (Diagnostics,
CodeLens, WebView/TreeView),
**(C)** Marketplace publishing and license/subscription mechanics, and
**(D)** product-specific integration notes for D5 (oasdiff) and D6
(terraform plan JSON).

---

## A. Extension anatomy and activation

### package.json is the manifest

VS Code extensions use `package.json` for ALL metadata, activation, and
contribution declarations — NOT a separate `manifest.json`.

```json
{
  "name": "openapi-breaking-change-lens",
  "displayName": "OpenAPI Breaking-Change Lens",
  "publisher": "your-publisher-id",
  "version": "0.1.0",
  "engines": { "vscode": "^1.85.0" },
  "activationEvents": ["onLanguage:yaml", "onLanguage:json"],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [{ "command": "oapilens.runDiff", "title": "OAPI: Diff against baseline" }],
    "views": { "explorer": [{ "id": "oapiChanges", "name": "Breaking Changes" }] }
  },
  "devDependencies": { "@types/vscode": "^1.85.0", "typescript": "^5.x" }
}
```

**Key differences from Chrome MV3:**
- Activation is event-driven (`activationEvents`) not always-on
- No service-worker pattern; the extension host IS the persistent process
- No offscreen documents; run heavy work in a worker thread or language server
- Testing uses `@vscode/test-electron` (launches a real VS Code instance)

### Activation lifecycle

```typescript
// src/extension.ts (main entry)
import * as vscode from 'vscode';

export function activate(ctx: vscode.ExtensionContext): void {
  // All subscriptions go into ctx.subscriptions — they're disposed automatically on deactivation.
  ctx.subscriptions.push(
    vscode.commands.registerCommand('oapilens.runDiff', () => runDiff(ctx)),
    vscode.languages.registerCodeLensProvider({ pattern: '**/*.{yaml,yml,json}' }, new OapiLensProvider()),
  );
}

export function deactivate(): void { /* VS Code handles subscription disposal */ }
```

- **`ctx.subscriptions.push(disposable)`** — the idiomatic resource-management pattern; avoids leaks
- **No teardown logic in `deactivate()`** — almost always empty; the subscription list handles it
- **Never store state outside `ExtensionContext`** — the extension process can be restarted

### Secrets and license keys

```typescript
// Read/write secret (never in settings — those are plaintext)
await ctx.secrets.store('license_key', 'lmq_live_...');
const key = await ctx.secrets.get('license_key');
```

- VS Code's `SecretStorage` API uses OS keychain — safe for license keys
- `ctx.globalState.update(k, v)` for non-secret persistent state (active license tier, first-run flag)
- `ctx.workspaceState` for per-workspace state (last-diffed file path, etc.)

---

## B. The three UI primitives

### B1. Diagnostic provider (inline squiggles)

Best for: flagging breaking changes at the LOCATION they occur in the file.

```typescript
const collection = vscode.languages.createDiagnosticCollection('openapi-breaking');
// ctx.subscriptions.push(collection) — auto-cleared on deactivation

function publishDiagnostics(doc: vscode.TextDocument, breakingChanges: BreakingChange[]): void {
  const diagnostics = breakingChanges.map(c => new vscode.Diagnostic(
    new vscode.Range(c.line, 0, c.line, 999),
    c.message,
    vscode.DiagnosticSeverity.Error,   // or Warning for "NORMAL" tier changes
  ));
  collection.set(doc.uri, diagnostics);
}

// Update on file save (not on every keystroke — oasdiff can be slow)
vscode.workspace.onDidSaveTextDocument(doc => {
  if (isOpenApiFile(doc)) runAnalysis(doc);
}, null, ctx.subscriptions);
```

**Critical invariant:** Always clear the collection for a file when its diagnostics
are recomputed (`collection.set(uri, [])` then re-set) or the old squiggles persist
even after the user fixes the file.

### B2. CodeLens provider (inline action above a line)

Best for: showing "N breaking changes detected" above the `openapi:` declaration
with a clickable link to open the full-diff panel.

```typescript
class OapiLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(doc: vscode.TextDocument): vscode.CodeLens[] {
    const firstLine = doc.lineAt(0);
    if (!firstLine.text.startsWith('openapi:')) return [];
    const cmd: vscode.Command = { title: '$(warning) 3 breaking changes', command: 'oapilens.showPanel' };
    return [new vscode.CodeLens(firstLine.range, cmd)];
  }
}
```

- CodeLenses are ephemeral; they're re-requested on every editor focus/scroll
- Store analysis results outside the provider (a `Map<string, AnalysisResult>`) and read them
- Refresh the lens after analysis completes: `this._onDidChangeCodeLenses.fire()`

### B3. WebView panel (full diff UI)

Best for: D5/D6 diff result panels showing the full classified change list — mirrors
BidDiff's side-panel pattern but lives as a VS Code WebView instead.

```typescript
const panel = vscode.window.createWebviewPanel(
  'oapiDiff',
  'OpenAPI Breaking Changes',
  vscode.ViewColumn.Beside,
  { enableScripts: true, localResourceRoots: [ctx.extensionUri] },
);
// Inject React bundle and send data via postMessage
panel.webview.postMessage({ type: 'DIFF_RESULT', changes: breakingChanges });
panel.webview.onDidReceiveMessage(msg => { /* copy-to-clipboard, etc. */ });
```

**Security:** `enableScripts: true` is intentional for a React UI; restrict `localResourceRoots`
to the extension's own bundle. Never build the HTML from user-provided strings.

**Reuse:** The WebView HTML/CSS/JS is almost identical to BidDiff's side-panel — same React
component tree, same ChangeCard rendering, same export utilities. Vite bundles it; the only
difference is the message-passing bridge (WebView postMessage vs Chrome extension messaging).

### B4. TreeView (lightweight sidebar list)

An alternative to WebView for simpler use cases — no React bundle required.

```typescript
class ChangeTreeProvider implements vscode.TreeDataProvider<ChangeItem> {
  getTreeItem(el: ChangeItem): vscode.TreeItem { return el; }
  getChildren(): ChangeItem[] { return this.changes; }
}
vscode.window.registerTreeDataProvider('oapiChanges', new ChangeTreeProvider());
```

TreeView is better when the data is read-only and hierarchical. WebView is better when
the UI needs rich formatting (before/after diffs, severity badges, copy buttons).
**Default to WebView for D5/D6** — the visual fidelity of before/after diff display matters
to the core use case.

---

## C. Marketplace publishing and license mechanics

### Publishing to VS Code Marketplace

```bash
npm install -g @vscode/vsce   # the publisher CLI
vsce package                  # produces openapi-breaking-change-lens-0.1.0.vsix
vsce publish                  # requires publisher account + PAT
```

- Create a publisher at https://marketplace.visualstudio.com/manage
- The PAT scope: Marketplace → Manage
- Set `"publisher"` in package.json to match the publisher ID
- The extension ID is `publisher.name` (e.g. `acmecorp.openapi-breaking-change-lens`)

**Critical:** the extension's `.vsix` is code-signed and submitted to Microsoft. No HTTPS
calls to external servers happen during publish — only the `.vsix` is uploaded. Runtime
license checks do hit an external server; isolate those calls.

### Free tier / paid Pro

VS Code Marketplace has no built-in payment. The model used by other paid extensions:

1. **Free base extension, Pro license unlocks more.** On install, the extension is fully
   functional for the first N files per day (free tier) or after entering a license key.
2. **License key via LemonSqueezy** (the BidDiff pattern): user buys at lemon.co,
   gets an email with a key, pastes it into the VS Code command palette prompt.
   The extension stores it in `SecretStorage` and validates against the LS API.
3. **Variant: OAuth flow.** More complex; involves a browser auth redirect. Avoid for v1.

**Free → paid threshold:** 1,000 installs is the empirical threshold before users pay.
Build free first; add Pro gate after reaching 1K. The D5/D6 plan: free beachhead →
1,000-install traction gate → introduce Pro tier with extended analysis (private repos,
multi-schema comparison, team-shared baseline).

### License validation (same LemonSqueezy pattern as BidDiff)

```typescript
async function validateLicense(key: string): Promise<'active' | 'expired' | 'invalid'> {
  const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ license_key: key }),
  });
  const data = await res.json();
  return data.activated ? 'active' : data.license_key?.status === 'expired' ? 'expired' : 'invalid';
}
```

**Important:** wrap in `ctx.secrets` reads/writes; never log or telemetry the key value.

---

## D. Product-specific integration notes

### D5 — OpenAPI Breaking-Change Lens (beachhead: oasdiff)

**The diff engine:** `oasdiff` is an open-source Go library with a JavaScript/WASM build.
It takes two OpenAPI specs (JSON or YAML) and returns a structured diff including:
- Breaking changes (operationId removed, required field added, type changed)
- Non-breaking changes (description added, new optional field)

```typescript
import { diff, breaking } from 'oasdiff';    // hypothetical JS wrapper
const result = diff(baselineYaml, currentYaml);
const breakingChanges = breaking(result);    // filtered to breaking-only
```

**The wedge:** oasdiff itself exists, but has no VS Code extension as of 2026-06-06.
The gap is the IDE-native, instant-feedback-on-save experience — users today run oasdiff
as a CLI in their terminal or CI pipeline; the extension brings it to where they write code.

**Baseline storage:** the extension needs to know WHAT to diff against. Two options:
1. **Git baseline** (preferred): diff current file against `HEAD~1` or the last committed
   version. Use `vscode.workspace.openTextDocument` on the git-object path.
2. **Explicit file selection**: user picks a baseline file via file picker.
   Store the choice in `ctx.workspaceState`.

**File detection heuristic:** a YAML/JSON file is an OpenAPI spec if it contains
`openapi:` (v3) or `swagger:` (v2) at the top level. Run this cheaply on file open
before invoking the heavier oasdiff analysis.

**Schema to category mapping:** adapt BidDiff's `critical.ts` CRITICAL_RULES pattern:
```typescript
const OAPI_CRITICAL_RULES = [
  { matches: (c) => c.type === 'endpoint-removed', reason: () => 'An API endpoint was removed.' },
  { matches: (c) => c.type === 'required-property-added', reason: () => 'A required request field was added.' },
  // etc.
];
```

This is the same rule-pack-loader pattern as the D-family — oasdiff's breaking-change
taxonomy maps directly onto the `ChangeCategory` × `Severity` output model.

### D6 — Terraform Plan Destructive-Change Classifier

**Input:** `terraform plan -out=plan.tfplan && terraform show -json plan.tfplan > plan.json`

The plan JSON has a stable schema since Terraform 0.12 (`resource_changes` array,
each with `actions: ['create'|'update'|'delete'|'no-op']` and `before`/`after` objects).

```typescript
interface TfChange {
  address: string;       // "aws_instance.web"
  type: string;          // "aws_instance"
  actions: string[];     // ["delete", "create"] = replace
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}
```

**Critical classification rules:**
```typescript
const TF_CRITICAL_RULES = [
  {
    matches: (c: TfChange) => c.actions.includes('delete') || c.actions.includes('replace'),
    reason: (c: TfChange) => `${c.address} will be destroyed/replaced.`,
  },
  {
    matches: (c: TfChange) => isDataStoreResource(c.type) && c.actions.includes('update'),
    reason: (c: TfChange) => `Data store ${c.address} will be modified in-place.`,
  },
  {
    matches: (c: TfChange) => isIamOrSecurityGroup(c.type) && hasWidening(c.before, c.after),
    reason: (c: TfChange) => `${c.address}: IAM/security-group change may widen access.`,
  },
];
```

**Activation trigger:** `plan.json` is not a VS Code "language"; activate on file pattern
match (`activationEvents: ["workspaceContains:**/plan.json"]`) or via command palette.

**User workflow:** `terraform plan -json > plan.json` → open plan.json in VS Code →
extension auto-classifies → opens a WebView panel showing CRITICAL/NORMAL breakdown.
The WebView reuses BidDiff's ChangeCard component directly.

---

## E. Key archetypes from D5/D6 — lessons before the build starts

1. **oasdiff is a library, not a service.** Bundle it as a dependency; no network call
   for the diff. This is the on-device trust wedge — "your API spec never leaves your machine."

2. **Plan JSON parsing has no schema evolution risk.** Terraform's plan schema has been
   stable since 0.12; `resource_changes[*].actions` is the only field needed for
   classification. Do NOT depend on unstable nested attributes.

3. **The VS Code extension scaffold is thin.** The heavy logic (oasdiff parsing, plan JSON
   walking, rule application) lives in pure TypeScript modules testable with Vitest — not in
   VS Code API surface. The extension host is just wiring. Same principle as BidDiff: the
   engine is framework-agnostic; the extension is a thin adapter.

4. **Testing:** use Vitest for unit tests (the engine), `@vscode/test-electron` only for
   activation lifecycle and UI integration tests. The ratio should be ~90% Vitest,
   ~10% electron tests (electron tests are slow and flaky).

5. **Don't over-extend the WebView.** For v1, the WebView can be a static HTML string with
   an embedded React bundle. For v2+, split to a proper Vite-built asset bundle. Same
   split decision as BidDiff: ship the simplest thing that works, then upgrade.

6. **Versioning:** bump PATCH on bug fixes, MINOR on new rule additions, MAJOR on rule
   removals or breaking config changes. Users expect extension updates to auto-install;
   never make a minor update break their workflow.

# DESIGN: openapi-lens Phase 1 — VS Code Extension Scaffold

> Pre-design written 2026-06-06 (ahead of the 2026-06-13 Proposal #3 auto-proceed).
> Phase 0 engine complete: 345/345 tests, all OapiSchema fields covered, 80+ classify rules.
> This document specifies Phase 1 precisely enough that the first build session starts
> from an architectural decision rather than from discovery.

---

## Goals and scope

Phase 1 ships a VS Code extension that:

1. Activates on any YAML or JSON file that looks like an OpenAPI spec
2. Diffs the current file against a baseline (git HEAD version or user-selected file)
3. Shows inline diagnostics (squiggles) for `BREAKING` severity changes
4. Shows a CodeLens count above the `openapi:` declaration
5. Provides a command to open a baseline file picker

Phase 1 does NOT include: WebView panel, monetization/license gates, multi-schema
comparison. Those are Phase 2.

---

## Architecture

### File layout

```
products/openapi-lens/
├── src/
│   ├── engine/               ← Phase 0 (complete, 345/345 tests)
│   │   ├── types.ts
│   │   ├── parser.ts
│   │   ├── diff.ts
│   │   ├── classify.ts
│   │   └── index.ts          ← analyzeOpenApiDiff(), breakingOnly()
│   ├── extension/            ← Phase 1 (new)
│   │   ├── extension.ts      ← activate() / deactivate()
│   │   ├── detector.ts       ← isOpenApiDocument(doc): boolean
│   │   ├── baseline.ts       ← getBaselineText(doc, ctx): Promise<string | null>
│   │   ├── diagnostics.ts    ← changesToDiagnostics(changes, doc): Diagnostic[]
│   │   └── codelens.ts       ← OapiCodeLensProvider
│   └── test/
│       └── extension/        ← Phase 1 unit tests (Vitest, not @vscode/test-electron)
│           ├── detector.test.ts
│           ├── diagnostics.test.ts
│           └── baseline.test.ts (mocked git API)
├── package.json              ← add VS Code extension fields
├── tsconfig.json             ← add vscode type declarations
└── vite.config.ts            ← add extension bundle target
```

### Key invariant

**The engine (`src/engine/`) NEVER imports from VS Code.** It is pure TypeScript, tested
with Vitest, framework-agnostic. The extension (`src/extension/`) wires VS Code APIs to the
engine. This is the same pattern as BidDiff (engine → adapter → UI) and makes the engine
fully testable without spinning up a VS Code instance.

---

## module: `detector.ts`

Decides if a document is an OpenAPI spec without running the full parser.

```typescript
export function isOpenApiDocument(doc: vscode.TextDocument): boolean {
  if (doc.languageId !== 'yaml' && doc.languageId !== 'json') return false;
  const first500 = doc.getText(new vscode.Range(0, 0, 20, 0));
  return /^\s*(openapi|swagger)\s*:/m.test(first500);
}
```

Tests (Vitest, no VS Code dependency — mock `vscode.TextDocument`):
- YAML with `openapi: 3.0.0` on first line → true
- YAML with `swagger: '2.0'` → true
- YAML with no openapi/swagger key → false
- JSON with `{"openapi": "3.0.0", ...}` → true
- Non-YAML/JSON (`languageId: 'typescript'`) → false

---

## module: `baseline.ts`

Returns the baseline text to diff against. Two strategies:

**Strategy A — Git HEAD (primary):**

```typescript
import * as vscode from 'vscode';

export async function getBaselineText(
  doc: vscode.TextDocument,
  ctx: vscode.ExtensionContext,
): Promise<string | null> {
  // Check if user explicitly chose a baseline for this workspace
  const explicitPath = ctx.workspaceState.get<string>(`baseline:${doc.uri.fsPath}`);
  if (explicitPath) {
    try {
      const uri = vscode.Uri.file(explicitPath);
      const bytes = await vscode.workspace.fs.readFile(uri);
      return Buffer.from(bytes).toString('utf-8');
    } catch { /* fall through to git */ }
  }

  // Git HEAD version
  const gitExtension = vscode.extensions.getExtension('vscode.git');
  if (!gitExtension) return null;
  const git = gitExtension.exports.getAPI(1);
  const repo = git.repositories.find(
    (r: { rootUri: vscode.Uri }) => doc.uri.fsPath.startsWith(r.rootUri.fsPath)
  );
  if (!repo) return null;

  try {
    // Read the file at HEAD
    const headContent = await repo.show('HEAD', doc.uri.fsPath);
    return headContent;
  } catch {
    return null;  // not committed yet, or git error
  }
}
```

**Strategy B — explicit file picker:**

```typescript
export async function selectBaseline(
  doc: vscode.TextDocument,
  ctx: vscode.ExtensionContext,
): Promise<void> {
  const uris = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: { 'OpenAPI files': ['yaml', 'yml', 'json'] },
  });
  if (uris?.[0]) {
    ctx.workspaceState.update(`baseline:${doc.uri.fsPath}`, uris[0].fsPath);
    // Trigger re-analysis
    analyzeAndPublish(doc, ctx);
  }
}
```

**Test strategy:** Mock the git extension API. Key test cases:
- Git HEAD content available → returns baseline string
- Git not available (no extension) → returns null
- File not committed yet (HEAD throws) → returns null
- Explicit baseline set → returns that file's content
- Explicit baseline file deleted → falls back to git

---

## module: `diagnostics.ts`

Converts `BreakingChange[]` + `vscode.TextDocument` into `vscode.Diagnostic[]`.

**Line number mapping (Phase 1: block-level approach):**

For each `BreakingChange`, find the line of the path+method operation block.

```typescript
import { BreakingChange } from '../engine/types';
import * as vscode from 'vscode';

export function changesToDiagnostics(
  changes: BreakingChange[],
  doc: vscode.TextDocument,
): vscode.Diagnostic[] {
  const text = doc.getText();
  const lines = text.split('\n');

  return changes.map(c => {
    const line = findOperationLine(lines, c.path, c.method);
    const range = new vscode.Range(line, 0, line, lines[line]?.length ?? 80);
    const severity = c.severity === 'BREAKING'
      ? vscode.DiagnosticSeverity.Error
      : vscode.DiagnosticSeverity.Warning;
    const diagnostic = new vscode.Diagnostic(range, c.message, severity);
    diagnostic.source = 'OpenAPI Lens';
    diagnostic.code = c.type;
    return diagnostic;
  });
}

function findOperationLine(lines: string[], path: string, method: string): number {
  // Search for the path definition in YAML structure
  // e.g., path='/users' → look for '  /users:' or '/users:'
  const pathPattern = new RegExp(`^\\s*${escapeRegex(path)}\\s*:`, 'm');
  const methodPattern = new RegExp(`^\\s*${method.toLowerCase()}\\s*:`, 'm');

  // Find the path line first, then search forward for the method line
  const pathLine = lines.findIndex(l => pathPattern.test(l));
  if (pathLine === -1) return 0;  // fallback to top of file

  // Find method within the next 50 lines (within the path block)
  for (let i = pathLine + 1; i < Math.min(pathLine + 50, lines.length); i++) {
    if (methodPattern.test(lines[i])) return i;
  }
  return pathLine;  // fallback to path line
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

**Key test cases:**
- BREAKING change at `/users GET` → diagnostic at the GET line
- INFO change → DiagnosticSeverity.Warning
- Path not found in doc → fallback to line 0 (top of file), no throw
- Multiple changes at same path → each gets its own diagnostic
- Empty change list → empty diagnostic array

---

## module: `codelens.ts`

Shows "3 BREAKING · 2 INFO" above the `openapi:` declaration.

```typescript
import * as vscode from 'vscode';
import { BreakingChange } from '../engine/types';

export class OapiCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  // Cache per document URI
  private readonly resultCache = new Map<string, BreakingChange[]>();

  update(uri: vscode.Uri, changes: BreakingChange[]): void {
    this.resultCache.set(uri.toString(), changes);
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(doc: vscode.TextDocument): vscode.CodeLens[] {
    const changes = this.resultCache.get(doc.uri.toString());
    if (!changes) return [];

    const breaking = changes.filter(c => c.severity === 'BREAKING').length;
    const info = changes.filter(c => c.severity === 'INFO').length;

    const title = breaking === 0
      ? `$(check) No breaking changes`
      : `$(warning) ${breaking} breaking${info > 0 ? ` · ${info} info` : ''}`;

    const line0 = doc.lineAt(0).range;
    return [new vscode.CodeLens(line0, {
      title,
      command: 'oapilens.showPanel',  // Phase 2: open WebView
      tooltip: `${breaking} BREAKING changes, ${info} INFO changes`,
    })];
  }
}
```

---

## module: `extension.ts`

Main entry point that wires everything together.

```typescript
import * as vscode from 'vscode';
import { analyzeOpenApiDiff } from '../engine/index';
import { isOpenApiDocument } from './detector';
import { getBaselineText, selectBaseline } from './baseline';
import { changesToDiagnostics } from './diagnostics';
import { OapiCodeLensProvider } from './codelens';

const COLLECTION_ID = 'openapi-breaking';

export function activate(ctx: vscode.ExtensionContext): void {
  const collection = vscode.languages.createDiagnosticCollection(COLLECTION_ID);
  const lensProvider = new OapiCodeLensProvider();

  ctx.subscriptions.push(
    collection,
    vscode.languages.registerCodeLensProvider(
      { pattern: '**/*.{yaml,yml,json}' },
      lensProvider,
    ),
    vscode.commands.registerCommand('oapilens.selectBaseline', () => {
      const doc = vscode.window.activeTextEditor?.document;
      if (doc) selectBaseline(doc, ctx);
    }),
    vscode.workspace.onDidSaveTextDocument(async doc => {
      if (!isOpenApiDocument(doc)) return;
      const baselineText = await getBaselineText(doc, ctx);
      if (!baselineText) {
        collection.set(doc.uri, []);
        lensProvider.update(doc.uri, []);
        return;
      }
      try {
        const changes = analyzeOpenApiDiff(baselineText, doc.getText());
        collection.set(doc.uri, changesToDiagnostics(changes, doc));
        lensProvider.update(doc.uri, changes);
      } catch (err) {
        // parseOapiSpec throws on invalid YAML — clear diagnostics, don't crash
        collection.set(doc.uri, []);
        lensProvider.update(doc.uri, []);
      }
    }),
    vscode.workspace.onDidCloseTextDocument(doc => {
      collection.delete(doc.uri);
    }),
  );

  // Run analysis on already-open documents at activation time
  for (const editor of vscode.window.visibleTextEditors) {
    if (isOpenApiDocument(editor.document)) {
      getBaselineText(editor.document, ctx).then(baselineText => {
        if (!baselineText) return;
        const changes = analyzeOpenApiDiff(baselineText, editor.document.getText());
        collection.set(editor.document.uri, changesToDiagnostics(changes, editor.document));
        lensProvider.update(editor.document.uri, changes);
      }).catch(() => {/* ignore at startup */});
    }
  }
}

export function deactivate(): void { /* subscriptions auto-disposed */ }
```

---

## package.json extension fields to add

```json
{
  "engines": { "vscode": "^1.85.0" },
  "activationEvents": ["onLanguage:yaml", "onLanguage:json"],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "oapilens.selectBaseline",
        "title": "OpenAPI Lens: Select Baseline File..."
      }
    ]
  },
  "dependencies": {
    "js-yaml": "^4.1.0"    ← already in package.json from Phase 0
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0"
  }
}
```

Note: the extension's `main` points to `./dist/extension.js` which is the Vite-bundled
output of `src/extension/extension.ts`. The Phase 0 engine (`src/engine/`) is bundled in.

---

## Vite build change for Phase 1

Phase 0 used Vite in library mode to bundle the engine. Phase 1 adds an extension entry:

```typescript
// vite.config.ts — new entry for the VS Code extension bundle
{
  build: {
    lib: {
      entry: 'src/extension/extension.ts',
      formats: ['cjs'],        // VS Code requires CommonJS
      fileName: 'extension',
    },
    rollupOptions: {
      external: ['vscode'],    // vscode is provided by the host, never bundled
    },
  }
}
```

The engine bundle (library mode) and the extension bundle (CJS) are separate build targets.
Two `build` calls: `vite build --config vite.config.engine.ts` and
`vite build --config vite.config.ext.ts`.

---

## Phase 1 test plan (Vitest — no electron)

Target: ~60 new tests across the new Phase 1 modules. Zero `@vscode/test-electron` tests
in Phase 1 (too slow; the engine unit tests provide correctness; VS Code integration testing
is Phase 2).

| Module | Test cases | Count |
|---|---|---|
| `detector.ts` | 5 cases above | 5 |
| `baseline.ts` | git available/unavailable/throws, explicit set/fall-through, file-deleted | 8 |
| `diagnostics.ts` | BREAKING→Error, INFO→Warning, path-not-found fallback, empty list, multiple at same path | 8 |
| `codelens.ts` | 0 breaking (green label), N breaking, N+M, update fires event, cache miss | 6 |
| `extension.ts` (logic-only, no VS Code API) | parse throws → no crash; no baseline → empty diagnostics | 4 |
| **Total new Phase 1 tests** | | **~31** |

Phase 1 target: 345 (Phase 0) + 31 (Phase 1) = **~376 tests** before any VS Code integration tests.

---

## Known Phase 1 limitations (document in PROGRESS.md Phase 1 notes)

- **Line number mapping is block-level**, not field-level. A diagnostic for a type change on
  `properties.userId` appears at the GET line, not the `userId:` line. Precise mapping
  requires CST-based parsing (Phase 2).
- **Git baseline assumes HEAD**. Multi-branch comparison (e.g., diff against `main`) requires
  a branch-picker command (Phase 2).
- **No WebView panel**. The CodeLens is clickable but the `oapilens.showPanel` command is a
  stub. Full diff panel is Phase 2.
- **No license gate**. Extension is fully free in Phase 1. Gate after 1,000 installs (Phase 3).
- **YAML/JSON only**. No `.proto`, no Terraform plan. Phase 4 adds D6 as a format pack.

---

## Phase 1 completion gate

The critique panel runs after Phase 1 completes. Phase 1 is done when:
1. All module unit tests green (target ~376 total)
2. Extension activates on a real YAML OpenAPI spec in VS Code (manual verification)
3. Diagnostics appear on file save when there IS a git HEAD version to diff against
4. Diagnostics clear on file save when the spec is identical to HEAD
5. CodeLens shows correct count
6. `selectBaseline` command works
7. No crash on invalid YAML, missing git, unrecognized file type
8. Typecheck clean (`tsc --noEmit`)

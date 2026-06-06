import * as vscode from "vscode";
import { isOpenApiDocument } from "./openApiDetector.js";
import { buildDiagnostics } from "./providers/diagnosticProvider.js";
import { OpenApiCodeLensProvider } from "./providers/codeLensProvider.js";
import { fetchGitHeadContent } from "./baseline/gitBaseline.js";
import { registerCommands } from "./commands.js";
import { analyzeOpenApiDiff } from "../engine/index.js";
import type { BreakingChange } from "../engine/types.js";

let diagnosticCollection: vscode.DiagnosticCollection | undefined;
let codeLensProvider: OpenApiCodeLensProvider | undefined;

// In-memory baseline override (set by selectBaseline command).
let manualBaselineContent: string | null = null;

export function activate(context: vscode.ExtensionContext): void {
  diagnosticCollection = vscode.languages.createDiagnosticCollection("openapi-lens");
  context.subscriptions.push(diagnosticCollection);

  codeLensProvider = new OpenApiCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      [{ language: "yaml" }, { language: "json" }],
      codeLensProvider,
    ),
    codeLensProvider,
  );

  registerCommands(context, {
    onBaselineSelected(content) {
      manualBaselineContent = content;
      const active = vscode.window.activeTextEditor?.document;
      if (active) void analyzeDocument(active);
    },
    onBaselineCleared() {
      manualBaselineContent = null;
      const active = vscode.window.activeTextEditor?.document;
      if (active) void analyzeDocument(active);
    },
  });

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      void analyzeDocument(doc);
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) void analyzeDocument(editor.document);
    }),
  );

  // Analyze the currently open document immediately on activation.
  const active = vscode.window.activeTextEditor?.document;
  if (active) void analyzeDocument(active);
}

async function analyzeDocument(document: vscode.TextDocument): Promise<void> {
  if (!diagnosticCollection || !codeLensProvider) return;
  if (!isOpenApiDocument(document)) {
    diagnosticCollection.delete(document.uri);
    codeLensProvider.clear();
    return;
  }

  const currentText = document.getText();
  const baselineText = await resolveBaseline(document);
  if (baselineText === null) {
    // No baseline available — show prompt via CodeLens but no diagnostics.
    diagnosticCollection.delete(document.uri);
    codeLensProvider.clear();
    return;
  }

  try {
    const changes: BreakingChange[] = analyzeOpenApiDiff(baselineText, currentText);
    diagnosticCollection.set(document.uri, buildDiagnostics(changes, document));
    codeLensProvider.update(changes);
  } catch {
    // Parse errors in the spec — clear stale diagnostics.
    diagnosticCollection.delete(document.uri);
    codeLensProvider.clear();
  }
}

async function resolveBaseline(document: vscode.TextDocument): Promise<string | null> {
  // 1. In-memory override from selectBaseline command.
  if (manualBaselineContent !== null) return manualBaselineContent;

  // 2. Configured file path in settings.
  const config = vscode.workspace.getConfiguration("openapi-lens");
  const configuredPath: string = config.get("baselineFile", "");
  if (configuredPath) {
    try {
      const uri = vscode.Uri.file(configuredPath);
      const bytes = await vscode.workspace.fs.readFile(uri);
      return Buffer.from(bytes).toString("utf-8");
    } catch {
      void vscode.window.showWarningMessage(
        `OpenAPI Lens: Could not read configured baseline file: ${configuredPath}`,
      );
    }
  }

  // 3. Git HEAD.
  return fetchGitHeadContent(document);
}

export function deactivate(): void {
  diagnosticCollection?.dispose();
  codeLensProvider?.dispose();
  diagnosticCollection = undefined;
  codeLensProvider = undefined;
  manualBaselineContent = null;
}

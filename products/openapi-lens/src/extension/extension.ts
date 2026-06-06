import * as vscode from "vscode";
import { isOpenApiDocument } from "./openApiDetector.js";
import { buildDiagnostics } from "./providers/diagnosticProvider.js";
import { OpenApiCodeLensProvider } from "./providers/codeLensProvider.js";
import { fetchGitHeadContent } from "./baseline/gitBaseline.js";
import { registerCommands } from "./commands.js";
import { activateTerraformSupport, deactivateTerraformSupport } from "./terraformExtension.js";
import { createChangeWebviewContent } from "./providers/changeWebviewProvider.js";
import { analyzeOpenApiDiff } from "../engine/index.js";
import type { BreakingChange } from "../engine/types.js";

let diagnosticCollection: vscode.DiagnosticCollection | undefined;
let codeLensProvider: OpenApiCodeLensProvider | undefined;
let changeWebviewPanel: vscode.WebviewPanel | undefined;
// Last known changes for the active OpenAPI document — used by showChangePanel command.
let lastKnownChanges: BreakingChange[] = [];

// Per-document manual baseline content, keyed by document URI string.
// Global manualBaselineContent was wrong: selecting a baseline for one spec
// should not affect other open OpenAPI specs.
const manualBaselineByUri = new Map<string, string>();

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

  context.subscriptions.push(
    vscode.commands.registerCommand("openapi-lens.showChangePanel", () => {
      showOpenApiWebviewPanel(lastKnownChanges);
    }),
  );

  registerCommands(context, {
    onBaselineSelected(content) {
      const active = vscode.window.activeTextEditor?.document;
      if (active) {
        manualBaselineByUri.set(active.uri.toString(), content);
        void analyzeDocument(active);
      }
    },
    onBaselineCleared() {
      const active = vscode.window.activeTextEditor?.document;
      if (active) {
        manualBaselineByUri.delete(active.uri.toString());
        void analyzeDocument(active);
      }
    },
  });

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      void analyzeDocument(doc);
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) void analyzeDocument(editor.document);
    }),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      // Clean up per-document baseline to avoid memory leaks.
      manualBaselineByUri.delete(doc.uri.toString());
    }),
  );

  // Activate D6 terraform plan support alongside D5 OpenAPI support.
  activateTerraformSupport(context);

  // Analyze the currently open document immediately on activation.
  const active = vscode.window.activeTextEditor?.document;
  if (active) void analyzeDocument(active);
}

function showOpenApiWebviewPanel(changes: BreakingChange[]): void {
  const content = createChangeWebviewContent(changes);
  if (changeWebviewPanel) {
    changeWebviewPanel.reveal(vscode.ViewColumn.Beside);
    changeWebviewPanel.webview.html = content;
    return;
  }
  changeWebviewPanel = vscode.window.createWebviewPanel(
    "openapi-lens.changePanel",
    "OpenAPI: Breaking Changes",
    vscode.ViewColumn.Beside,
    { enableScripts: false, retainContextWhenHidden: true },
  );
  changeWebviewPanel.webview.html = content;
  changeWebviewPanel.onDidDispose(() => {
    changeWebviewPanel = undefined;
  });
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
    // No baseline — surface actionable "Set baseline" prompt via CodeLens.
    diagnosticCollection.delete(document.uri);
    codeLensProvider.setNoBaseline();
    return;
  }

  try {
    // Filter to only BREAKING and INFO — SAFE changes are structural diffs that
    // don't affect API consumers and should not appear in the diagnostic panel.
    const allChanges: BreakingChange[] = analyzeOpenApiDiff(baselineText, currentText);
    const visibleChanges = allChanges.filter((c) => c.severity !== "SAFE");
    lastKnownChanges = visibleChanges;
    diagnosticCollection.set(document.uri, buildDiagnostics(visibleChanges, document));
    codeLensProvider.update(visibleChanges);
    // Auto-update the WebView panel if it's already open.
    if (changeWebviewPanel) {
      changeWebviewPanel.webview.html = createChangeWebviewContent(visibleChanges);
    }
  } catch {
    // Parse errors in the spec — clear stale diagnostics.
    diagnosticCollection.delete(document.uri);
    codeLensProvider.setNoBaseline();
  }
}

async function resolveBaseline(document: vscode.TextDocument): Promise<string | null> {
  // 1. Per-document in-memory override from selectBaseline command.
  const manual = manualBaselineByUri.get(document.uri.toString());
  if (manual !== undefined) return manual;

  // 2. Configured file path in workspace settings.
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

  // 3. Git HEAD (returns null if git extension unavailable or file untracked).
  return fetchGitHeadContent(document);
}

export function deactivate(): void {
  diagnosticCollection?.dispose();
  codeLensProvider?.dispose();
  changeWebviewPanel?.dispose();
  deactivateTerraformSupport();
  diagnosticCollection = undefined;
  codeLensProvider = undefined;
  changeWebviewPanel = undefined;
  lastKnownChanges = [];
  manualBaselineByUri.clear();
}

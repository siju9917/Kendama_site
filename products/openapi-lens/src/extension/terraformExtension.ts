import * as vscode from "vscode";
import { parseTerraformPlan, isTerraformPlanJson } from "../terraform/parser.js";
import { createPlanWebviewContent } from "../terraform/webview.js";
import type { TfPlanSummary } from "../terraform/types.js";

let statusBarItem: vscode.StatusBarItem | undefined;
let webviewPanel: vscode.WebviewPanel | undefined;

export function activateTerraformSupport(context: vscode.ExtensionContext): void {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) void analyzeTerraformDocument(editor.document);
    }),
  );

  // Analyze the currently open document on activation.
  const active = vscode.window.activeTextEditor?.document;
  if (active) void analyzeTerraformDocument(active);
}

export function deactivateTerraformSupport(): void {
  statusBarItem?.dispose();
  webviewPanel?.dispose();
  statusBarItem = undefined;
  webviewPanel = undefined;
}

async function analyzeTerraformDocument(document: vscode.TextDocument): Promise<void> {
  if (document.languageId !== "json") {
    hideTerraformUi();
    return;
  }

  const text = document.getText();
  if (!isTerraformPlanJson(text)) {
    hideTerraformUi();
    return;
  }

  let summary: TfPlanSummary;
  try {
    summary = parseTerraformPlan(text);
  } catch {
    void vscode.window.showErrorMessage(
      "OpenAPI Lens: This JSON does not appear to be a valid terraform show -json output.",
    );
    hideTerraformUi();
    return;
  }

  updateStatusBar(summary);
  showWebviewPanel(summary, document.uri);
}

function updateStatusBar(summary: TfPlanSummary): void {
  if (!statusBarItem) return;
  const parts: string[] = [];
  if (summary.critical > 0) parts.push(`$(error) ${summary.critical} CRITICAL`);
  if (summary.normal > 0) parts.push(`$(info) ${summary.normal} NORMAL`);
  if (parts.length === 0) parts.push("$(check) No critical changes");
  statusBarItem.text = `TF: ${parts.join(" · ")}`;
  statusBarItem.tooltip = "Terraform Plan Classifier — click to open panel";
  statusBarItem.command = "openapi-lens.showTerraformPanel";
  statusBarItem.show();
}

function hideTerraformUi(): void {
  statusBarItem?.hide();
}

function showWebviewPanel(summary: TfPlanSummary, planUri: vscode.Uri): void {
  const content = createPlanWebviewContent(summary);

  if (webviewPanel) {
    webviewPanel.reveal(vscode.ViewColumn.Beside);
    webviewPanel.webview.html = content;
    return;
  }

  webviewPanel = vscode.window.createWebviewPanel(
    "openapi-lens.terraformPlan",
    `TF Plan: ${planUri.path.split("/").pop() ?? "plan.json"}`,
    vscode.ViewColumn.Beside,
    {
      enableScripts: false,
      retainContextWhenHidden: true,
    },
  );
  webviewPanel.webview.html = content;

  webviewPanel.onDidDispose(() => {
    webviewPanel = undefined;
    statusBarItem?.hide();
  });
}

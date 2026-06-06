import * as vscode from "vscode";
import type { BreakingChange } from "../../engine/types.js";

/**
 * Returns the 0-indexed line number of the first line whose trimmed content
 * starts with the given key token, searching from startLine downward.
 * Falls back to 0 (top of file) when no match is found.
 */
export function findLineForLocation(
  document: vscode.TextDocument,
  location: string,
): number {
  // Use the last segment of the dotted path as the key to search for.
  const segments = location.split(/[.[\]]+/).filter(Boolean);
  for (let depth = segments.length - 1; depth >= 0; depth--) {
    const key = segments[depth];
    if (!key) continue;
    // Search YAML-style "key:" and JSON-style '"key":'.
    const yamlPattern = new RegExp(`^\\s*${escapeRegExp(key)}\\s*:`);
    const jsonPattern = new RegExp(`"${escapeRegExp(key)}"\\s*:`);
    for (let line = 0; line < document.lineCount; line++) {
      const text = document.lineAt(line).text;
      if (yamlPattern.test(text) || jsonPattern.test(text)) {
        return line;
      }
    }
  }
  return 0;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildDiagnostics(
  changes: BreakingChange[],
  document: vscode.TextDocument,
): vscode.Diagnostic[] {
  return changes.map((change) => {
    const line = findLineForLocation(document, change.location);
    const lineText = document.lineAt(line).text;
    const range = new vscode.Range(
      line,
      lineText.search(/\S/),
      line,
      lineText.length,
    );
    const severity =
      change.severity === "BREAKING"
        ? vscode.DiagnosticSeverity.Error
        : vscode.DiagnosticSeverity.Information;
    const diag = new vscode.Diagnostic(range, change.message, severity);
    diag.source = "openapi-lens";
    diag.code = change.type;
    return diag;
  });
}

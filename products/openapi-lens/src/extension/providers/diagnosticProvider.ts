import * as vscode from "vscode";
import type { BreakingChange } from "../../engine/types.js";

/**
 * Returns the 0-indexed line number for a dotted engine location path.
 *
 * Improvement over the old single-pass heuristic (POLISH N3):
 * - Segments are searched LEFT-TO-RIGHT (progressive), so each segment's
 *   search starts where the previous one was found — avoiding false matches
 *   in unrelated sections of large multi-operation specs.
 * - Pure numeric array-index segments (e.g. the "0" in "parameters[0]") are
 *   skipped because they don't appear as YAML map keys.
 * - Falls back to the last successfully-located segment when a leaf segment
 *   is absent; never regresses to line 0 if any ancestor was found.
 */
export function findLineForLocation(
  document: vscode.TextDocument,
  location: string,
): number {
  // Split on . and [ ] brackets; drop empty strings and pure numeric indices.
  const segments = location
    .split(/[.[\]]+/)
    .filter(Boolean)
    .filter((s) => !/^\d+$/.test(s));

  let searchFrom = 0;
  let lastFoundLine = 0;

  for (const key of segments) {
    const yamlPattern = new RegExp(`^\\s*${escapeRegExp(key)}\\s*:`);
    const jsonPattern = new RegExp(`"${escapeRegExp(key)}"\\s*:`);

    // Try a 300-line window first to stay within the current section, then
    // expand to the full remaining document if the window search fails.
    const windowEnd = Math.min(document.lineCount, searchFrom + 300);
    const found = findKeyInRange(document, yamlPattern, jsonPattern, searchFrom, windowEnd)
      ?? findKeyInRange(document, yamlPattern, jsonPattern, searchFrom, document.lineCount);

    if (found !== null) {
      lastFoundLine = found;
      searchFrom = found; // next segment searches forward from here
    }
  }

  return lastFoundLine;
}

function findKeyInRange(
  document: vscode.TextDocument,
  yamlPattern: RegExp,
  jsonPattern: RegExp,
  from: number,
  to: number,
): number | null {
  for (let line = from; line < to; line++) {
    const text = document.lineAt(line).text;
    if (yamlPattern.test(text) || jsonPattern.test(text)) return line;
  }
  return null;
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
    const startCol = Math.max(0, lineText.search(/\S/));
    const range = new vscode.Range(
      line,
      startCol,
      line,
      Math.max(startCol, lineText.length),
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

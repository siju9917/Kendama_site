import type { BreakingChange } from "../../engine/types.js";

/** Escapes HTML special characters to prevent injection in the WebView. */
function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Change types that are spec-level (not tied to a specific operation). */
const SPEC_LEVEL_TYPES = new Set(["server-removed", "server-added"]);

function renderChangeRow(c: BreakingChange): string {
  const badge =
    c.severity === "BREAKING"
      ? '<span class="badge breaking">BREAKING</span>'
      : '<span class="badge info">INFO</span>';
  const opCell = SPEC_LEVEL_TYPES.has(c.type)
    ? '<code class="spec-label">Spec-level</code>'
    : `<code>${esc(c.method.toUpperCase())} ${esc(c.path)}</code>`;
  return `
    <tr class="${c.severity.toLowerCase()}">
      <td>${badge}</td>
      <td>${opCell}</td>
      <td><code>${esc(c.location)}</code></td>
      <td>${esc(c.message)}</td>
    </tr>`;
}

/**
 * Generates a self-contained HTML string for the VS Code WebView panel.
 * Uses VS Code's CSS variables for theme compatibility.
 * No external resources — safe for WebView sandbox.
 *
 * @param baselineLabel - Human-readable description of the baseline source,
 *   e.g. "git HEAD", "selected file", or "workspace: baseline.yaml".
 *   Shown in the meta line so users know what the diff is comparing against.
 */
export function createChangeWebviewContent(
  changes: BreakingChange[],
  baselineLabel?: string,
): string {
  const breaking = changes.filter((c) => c.severity === "BREAKING");
  const info = changes.filter((c) => c.severity === "INFO");

  const summaryParts: string[] = [];
  if (breaking.length > 0)
    summaryParts.push(`<span class="pill breaking">${breaking.length} BREAKING</span>`);
  if (info.length > 0)
    summaryParts.push(`<span class="pill info">${info.length} INFO</span>`);

  const summaryBar =
    summaryParts.length > 0
      ? summaryParts.join(" ")
      : '<span class="pill safe">No changes detected</span>';

  // Render BREAKING rows first, then INFO — matches the diagnostic panel ordering.
  const rows = [...breaking, ...info].map(renderChangeRow).join("");

  const tableSection =
    changes.length > 0
      ? `<table>
  <thead><tr>
    <th>Severity</th><th>Operation</th><th>Location</th><th>Description</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>`
      : '<p class="empty">No API changes detected between baseline and current spec.</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; style-src 'unsafe-inline';">
<title>OpenAPI Breaking-Change Lens</title>
<style>
  body {
    font-family: var(--vscode-font-family, sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-foreground, #ccc);
    background: var(--vscode-editor-background, #1e1e1e);
    padding: 1rem;
    margin: 0;
  }
  h1 { font-size: 1.1em; margin-bottom: 0.4rem; }
  .meta { color: var(--vscode-descriptionForeground, #888); font-size: 0.9em; margin-bottom: 1rem; }
  .summary { margin-bottom: 1.2rem; }
  .pill {
    display: inline-block; padding: 2px 10px; border-radius: 3px;
    font-weight: bold; margin-right: 6px; font-size: 0.85em;
  }
  .pill.breaking { background: #6b1e1e; color: #f99; }
  .pill.info     { background: #1e3a6e; color: #9af; }
  .pill.safe     { background: #2a2a2a; color: #888; }
  table { border-collapse: collapse; width: 100%; }
  th {
    text-align: left; padding: 6px 8px;
    border-bottom: 1px solid var(--vscode-panel-border, #444);
    font-size: 0.85em; color: var(--vscode-descriptionForeground, #888);
  }
  td { padding: 6px 8px; vertical-align: top; border-bottom: 1px solid var(--vscode-panel-border, #444); }
  tr.breaking { background: rgba(180,30,30,0.08); }
  tr.info     { background: rgba(30,60,150,0.06); }
  .badge {
    display: inline-block; padding: 2px 8px; border-radius: 3px;
    font-size: 0.8em; font-weight: bold; white-space: nowrap;
  }
  .badge.breaking { background: #6b1e1e; color: #f99; }
  .badge.info     { background: #1e3a6e; color: #9af; }
  code { font-family: var(--vscode-editor-font-family, monospace); font-size: 0.85em; word-break: break-all; }
  code.spec-label { color: var(--vscode-descriptionForeground, #888); font-style: italic; }
  .empty { color: var(--vscode-descriptionForeground, #888); font-style: italic; }
</style>
</head>
<body>
<h1>OpenAPI Breaking-Change Lens</h1>
<p class="meta">${esc(String(changes.length))} change${changes.length !== 1 ? "s" : ""} detected${baselineLabel ? ` · baseline: ${esc(baselineLabel)}` : ""}</p>
<div class="summary">${summaryBar}</div>
${tableSection}
</body>
</html>`;
}

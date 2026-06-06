import type { TfClassification, TfOutputChange, TfPlanSummary } from "./types.js";

/** Escapes HTML special characters to prevent injection. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderOutputRow(o: TfOutputChange): string {
  const actionText = o.actions.join(", ");
  const valueText = o.sensitive ? "(sensitive — value hidden)" : `action: ${esc(actionText)}`;
  return `
    <tr>
      <td><code>${esc(o.name)}</code></td>
      <td>${esc(valueText)}</td>
    </tr>`;
}

function renderRow(c: TfClassification): string {
  const badge =
    c.severity === "CRITICAL"
      ? '<span class="badge critical">CRITICAL</span>'
      : c.severity === "NO-OP"
        ? '<span class="badge noop">NO-OP</span>'
        : '<span class="badge normal">NORMAL</span>';
  const reasons = c.reasons
    .map((r) => `<li>${esc(r)}</li>`)
    .join("");
  return `
    <tr class="${c.severity.toLowerCase()}">
      <td>${badge}</td>
      <td><code>${esc(c.change.address)}</code></td>
      <td><code>${esc(c.change.type)}</code></td>
      <td><code>${esc(c.change.actions.join(", "))}</code></td>
      <td><ul class="reasons">${reasons}</ul></td>
    </tr>`;
}

/**
 * Generates a self-contained HTML string for the WebView panel.
 * Uses VS Code's CSS variables for theme compatibility.
 * No external resources — safe for WebView sandbox.
 */
export function createPlanWebviewContent(summary: TfPlanSummary): string {
  const criticalRows = summary.changes.filter((c) => c.severity === "CRITICAL");
  const normalRows = summary.changes.filter((c) => c.severity === "NORMAL");
  const noOpRows = summary.changes.filter((c) => c.severity === "NO-OP");

  const summaryBar = [
    summary.critical > 0 ? `<span class="pill critical">${summary.critical} CRITICAL</span>` : "",
    summary.normal > 0 ? `<span class="pill normal">${summary.normal} NORMAL</span>` : "",
    summary.noOp > 0 ? `<span class="pill noop">${summary.noOp} NO-OP</span>` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const tableRows = [
    ...criticalRows.map(renderRow),
    ...normalRows.map(renderRow),
    ...noOpRows.map(renderRow),
  ].join("");

  const noChanges =
    summary.changes.length === 0
      ? '<p class="empty">No resource changes detected in this plan.</p>'
      : "";

  const total = summary.changes.length;
  const countSummary =
    total === 0
      ? "no resource changes"
      : [
          summary.critical > 0 ? `${summary.critical} CRITICAL` : "",
          summary.normal > 0 ? `${summary.normal} NORMAL` : "",
          summary.noOp > 0 ? `${summary.noOp} NO-OP` : "",
        ]
          .filter(Boolean)
          .join(" · ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; style-src 'unsafe-inline';">
<title>Terraform Plan Classifier</title>
<style>
  body {
    font-family: var(--vscode-font-family, sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-foreground, #ccc);
    background: var(--vscode-editor-background, #1e1e1e);
    padding: 1rem;
    margin: 0;
  }
  h1 { font-size: 1.2em; margin-bottom: 0.5rem; }
  .meta { color: var(--vscode-descriptionForeground, #888); margin-bottom: 1rem; font-size: 0.9em; }
  .summary { margin-bottom: 1.2rem; }
  .pill {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 3px;
    font-weight: bold;
    margin-right: 6px;
    font-size: 0.85em;
  }
  .pill.critical { background: #6b1e1e; color: #f99; }
  .pill.normal   { background: #1e4a1e; color: #9f9; }
  .pill.noop     { background: #2a2a2a; color: #888; }
  table { border-collapse: collapse; width: 100%; }
  th { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--vscode-panel-border, #444); font-size: 0.85em; color: var(--vscode-descriptionForeground, #888); }
  td { padding: 6px 8px; vertical-align: top; border-bottom: 1px solid var(--vscode-panel-border, #444); }
  tr.critical { background: rgba(180,30,30,0.08); }
  tr.normal   { background: rgba(30,120,30,0.05); }
  tr.noop     { opacity: 0.5; }
  .badge {
    display: inline-block; padding: 2px 8px; border-radius: 3px;
    font-size: 0.8em; font-weight: bold; white-space: nowrap;
  }
  .badge.critical { background: #6b1e1e; color: #f99; }
  .badge.normal   { background: #1e4a1e; color: #9f9; }
  .badge.noop     { background: #2a2a2a; color: #888; }
  code { font-family: var(--vscode-editor-font-family, monospace); font-size: 0.9em; }
  .reasons { margin: 0; padding-left: 1rem; }
  .reasons li { font-size: 0.85em; margin-bottom: 2px; }
  .empty { color: var(--vscode-descriptionForeground, #888); font-style: italic; }
  .limitations { margin-top: 1.5rem; font-size: 0.8em; color: var(--vscode-descriptionForeground, #888); border-top: 1px solid var(--vscode-panel-border, #444); padding-top: 0.8rem; }
</style>
</head>
<body>
<h1>Terraform Plan Classifier</h1>
<p class="meta">Terraform ${esc(summary.terraformVersion)} · ${total} resource change${total !== 1 ? "s" : ""}${total > 0 ? ` (${countSummary})` : ""}</p>
<div class="summary">${summaryBar || '<span class="pill noop">No changes</span>'}</div>
${noChanges}
${
  summary.changes.length > 0
    ? `<table>
  <thead><tr>
    <th>Severity</th><th>Resource</th><th>Type</th><th>Actions</th><th>Reasons</th>
  </tr></thead>
  <tbody>${tableRows}</tbody>
</table>`
    : ""
}
${summary.outputChanges.length > 0
  ? `<h2>Output Changes (${summary.outputChanges.length})</h2>
<p class="meta">Output value changes may affect downstream automation that reads these outputs.</p>
<table>
  <thead><tr><th>Output Name</th><th>Change</th></tr></thead>
  <tbody>${summary.outputChanges.map(renderOutputRow).join("")}</tbody>
</table>`
  : ""}
<div class="limitations">
  <strong>Phase 1 limitations:</strong> IAM/security changes are conservatively flagged regardless of direction.
  Binary plan format (<code>terraform plan -out=plan.bin</code>) is not supported — use <code>terraform show -json plan.bin</code>.
</div>
</body>
</html>`;
}

import React from "react";
import type { DiffResult } from "../core/diff/types.js";
import { exportPdfReport, copySummaryToClipboard } from "../core/export/index.js";

interface Props {
  result: DiffResult;
}

const CATEGORY_LABELS: Record<string, string> = {
  SCOPE_SOW: "Scope (SOW)",
  EVALUATION_CRITERIA: "Evaluation",
  DATES_DEADLINES: "Dates & deadlines",
  CLAUSES: "Clauses",
  SUBMISSION_INSTRUCTIONS: "Submission instructions",
  PRICING_CLINS: "Pricing / CLINs",
  ATTACHMENTS: "Attachments",
  OTHER: "Other",
};

export function Summary({ result }: Props): React.ReactElement {
  const totalChanges = result.changes.length;
  const onExportPdf = async (): Promise<void> => {
    try {
      await exportPdfReport(result);
    } catch (e) {
      console.error("Export failed:", e);
    }
  };
  const onCopy = async (): Promise<void> => {
    try {
      await copySummaryToClipboard(result);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  return (
    <div className="summary">
      <h2 className="summary__title">Summary</h2>
      <div className="summary__stats">
        <span className="summary__stat-label">Total changes</span>
        <span className="summary__stat-value">{totalChanges}</span>
        <span className="summary__stat-label">Critical</span>
        <span
          className={
            "summary__stat-value " +
            (result.criticalCount > 0 ? "summary__stat-value--critical" : "")
          }
        >
          {result.criticalCount}
        </span>
        <span className="summary__stat-label">Confidence</span>
        <span className="summary__stat-value">{(result.diffConfidence * 100).toFixed(0)}%</span>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "var(--fg-muted)" }}>
        {Object.entries(result.changeCountByCategory)
          .filter(([, n]) => n > 0)
          .map(([k, n]) => `${CATEGORY_LABELS[k] ?? k}: ${n}`)
          .join(" · ")}
      </div>

      {result.warnings.length > 0 && (
        <ul style={{ margin: "12px 0 0", paddingLeft: 18, color: "var(--fg-muted)" }}>
          {result.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button className="primary" onClick={onExportPdf}>
          Export PDF report
        </button>
        <button onClick={onCopy}>Copy summary</button>
      </div>
    </div>
  );
}

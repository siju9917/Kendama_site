import React, { useState } from "react";
import type { DiffResult } from "../core/diff/types.js";
import { exportPdfReport, copySummaryToClipboard, copyMarkdownToClipboard } from "../core/export/index.js";

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
  const [feedback, setFeedback] = useState<string>("");

  const flash = (text: string): void => {
    setFeedback(text);
    setTimeout(() => setFeedback(""), 1500);
  };

  const onExportPdf = async (): Promise<void> => {
    try {
      const blob = await exportPdfReport(result);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const sol = result.currentDoc.solicitationId ?? "biddiff-report";
      a.download = `${sol}-amendment-diff.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      flash("PDF downloaded");
    } catch (e) {
      console.error("Export failed:", e);
      flash("Export failed");
    }
  };
  const onCopyText = async (): Promise<void> => {
    try {
      await copySummaryToClipboard(result);
      flash("Summary copied");
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };
  const onCopyMarkdown = async (): Promise<void> => {
    try {
      await copyMarkdownToClipboard(result);
      flash("Markdown copied");
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  return (
    <div className="summary">
      <div className="summary__head">
        <h2 className="summary__title">Summary</h2>
        <div className="summary__actions">
          <button className="primary" onClick={onExportPdf}>
            Export PDF
          </button>
          <button onClick={onCopyText} title="Copy plain-text summary">
            Copy
          </button>
          <button onClick={onCopyMarkdown} title="Copy as Markdown">
            ⌃ Markdown
          </button>
        </div>
      </div>

      <div className="summary__stats">
        <div className="summary__stat">
          <span className="summary__stat-label">Total</span>
          <span className="summary__stat-value">{totalChanges}</span>
        </div>
        <div className="summary__stat">
          <span className="summary__stat-label">Critical</span>
          <span
            className={
              "summary__stat-value " +
              (result.criticalCount > 0 ? "summary__stat-value--critical" : "")
            }
          >
            {result.criticalCount}
          </span>
        </div>
        <div className="summary__stat">
          <span className="summary__stat-label">Confidence</span>
          <span className="summary__stat-value">{(result.diffConfidence * 100).toFixed(0)}%</span>
        </div>
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

      {feedback && (
        <div
          aria-live="polite"
          style={{ marginTop: 8, fontSize: 12, color: "var(--accent)" }}
        >
          {feedback}
        </div>
      )}
    </div>
  );
}

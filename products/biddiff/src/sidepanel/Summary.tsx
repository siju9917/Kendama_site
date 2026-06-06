import React, { useEffect, useRef, useState } from "react";
import type { DiffResult } from "../core/diff/types.js";
import { exportPdfReport, copySummaryToClipboard, copyMarkdownToClipboard } from "../core/export/index.js";
import { CATEGORY_LABELS, COPY_FEEDBACK_FLASH_MS } from "../shared/constants.js";

interface Props {
  result: DiffResult;
}

/** Sanitize a string for use as a downloaded filename. Strips characters
 * that are invalid on Windows / macOS / Linux file systems and trims. */
function safeFilename(s: string): string {
  const cleaned = s
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    // Collapse runs of dashes from the replace above so a title of
    // pure-invalid chars doesn't end up as "------".
    .replace(/-{2,}/g, "-")
    .replace(/^[-\s]+|[-\s.]+$/g, "")
    .trim()
    .slice(0, 80);
  return cleaned || "biddiff-report";
}

export function Summary({ result }: Props): React.ReactElement {
  const totalChanges = result.changes.length;
  const [feedback, setFeedback] = useState<string>("");
  const [busy, setBusy] = useState<"" | "pdf" | "text" | "md">("");
  // Synchronous mirror of `busy` so a rapid double-click can't slip
  // through between setBusy and the re-render that disables the button.
  const busyRef = useRef<"" | "pdf" | "text" | "md">("");
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const flash = (text: string): void => {
    setFeedback(text);
    // Long enough that an error message can be read; short enough that
    // the success state doesn't linger. Tracked so unmount clears it.
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => {
      flashTimer.current = null;
      setFeedback("");
    }, COPY_FEEDBACK_FLASH_MS);
  };

  const onExportPdf = async (): Promise<void> => {
    if (busyRef.current) return;
    busyRef.current = "pdf";
    setBusy("pdf");
    try {
      const blob = await exportPdfReport(result);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const sol = result.currentDoc.solicitationId ?? "biddiff-report";
      a.download = `${safeFilename(sol)}-amendment-diff.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Defer revoke so the browser has a moment to actually fetch
      // the blob URL — revoking synchronously can cancel the download
      // in some browser/version combinations.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      flash("PDF downloaded");
    } catch (e) {
      console.error("Export failed:", e);
      flash("Export failed — see console");
    } finally {
      busyRef.current = "";
      setBusy("");
    }
  };
  const onCopyText = async (): Promise<void> => {
    if (busyRef.current) return;
    busyRef.current = "text";
    setBusy("text");
    try {
      await copySummaryToClipboard(result);
      flash("Summary copied");
    } catch (e) {
      console.error("Copy failed:", e);
      flash("Copy failed — check clipboard permission");
    } finally {
      busyRef.current = "";
      setBusy("");
    }
  };
  const onCopyMarkdown = async (): Promise<void> => {
    if (busyRef.current) return;
    busyRef.current = "md";
    setBusy("md");
    try {
      await copyMarkdownToClipboard(result);
      flash("Markdown copied");
    } catch (e) {
      console.error("Copy failed:", e);
      flash("Copy failed — check clipboard permission");
    } finally {
      busyRef.current = "";
      setBusy("");
    }
  };

  return (
    <div className="summary">
      <div className="summary__head">
        <h2 className="summary__title">Summary</h2>
        <div className="summary__actions">
          <button
            className="primary"
            onClick={onExportPdf}
            disabled={busy !== ""}
            title="Export the full diff report as a PDF"
          >
            {busy === "pdf" ? "Exporting…" : "Export PDF"}
          </button>
          <button
            onClick={onCopyText}
            disabled={busy !== ""}
            title="Copy a plain-text summary to the clipboard"
          >
            {busy === "text" ? "Copying…" : "Copy text"}
          </button>
          <button
            onClick={onCopyMarkdown}
            disabled={busy !== ""}
            title="Copy as Markdown — paste into Slack, GitHub, Notion, Teams, or any markdown-aware app to keep formatting"
          >
            {busy === "md" ? "Copying…" : "Copy Markdown"}
          </button>
        </div>
      </div>

      <div className="summary__stats">
        <div className="summary__stat">
          <span className="summary__stat-label">Total</span>
          <span className="summary__stat-value">{totalChanges}</span>
        </div>
        <div
          className="summary__stat"
          tabIndex={0}
          aria-describedby="stat-desc-critical"
          title="What BidDiff flags as critical: changes to deadlines or dates, page limits or submission format, FAR/DFARS clause additions or removals, evaluation criteria, CLIN or pricing structure, and attachments added or removed."
        >
          <span className="summary__stat-label">
            Critical
            {/* The same text the mouse-only `title` carries, exposed to
                assistive tech via aria-describedby (the stat is focusable, so
                keyboard users reach it too). The pill stays decorative. */}
            <span className="info-pill" aria-hidden="true">i</span>
          </span>
          <span id="stat-desc-critical" className="sr-only">
            What BidDiff flags as critical: changes to deadlines or dates, page
            limits or submission format, FAR/DFARS clause additions or removals,
            evaluation criteria, CLIN or pricing structure, and attachments
            added or removed.
          </span>
          <span
            className={
              "summary__stat-value " +
              (result.criticalCount > 0 ? "summary__stat-value--critical" : "")
            }
          >
            {result.criticalCount}
          </span>
        </div>
        <div
          className="summary__stat"
          tabIndex={0}
          aria-describedby="stat-desc-confidence"
          title="How clean the underlying text extraction looked. Lower values mean the source PDFs were complex (scanned, two-column, etc.) and the diff may not catch every change."
        >
          <span className="summary__stat-label">
            Confidence
            <span className="info-pill" aria-hidden="true">i</span>
          </span>
          <span id="stat-desc-confidence" className="sr-only">
            How clean the underlying text extraction looked. Lower values mean
            the source PDFs were complex (scanned, two-column, etc.) and the
            diff may not catch every change.
          </span>
          <span className="summary__stat-value">{(result.diffConfidence * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        {Object.entries(result.changeCountByCategory)
          .filter(([, n]) => n > 0)
          .map(([k, n]) => (
            <span
              key={k}
              style={{
                fontSize: 11,
                padding: "2px 8px",
                background: "var(--bg-subtle)",
                color: "var(--fg-muted)",
                borderRadius: 999,
              }}
            >
              {CATEGORY_LABELS[k] ?? k}: {n}
            </span>
          ))}
      </div>

      {/* Warnings are rendered once at the top of DiffView in the
          warning-banner — listing them again here was a duplicate. */}

      {feedback && (
        <div className="feedback-line" aria-live="polite">
          {feedback}
        </div>
      )}
    </div>
  );
}

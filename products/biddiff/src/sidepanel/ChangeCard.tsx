import React, { useState } from "react";
import type { Change, TokenSpan } from "../core/diff/types.js";
import { DISCLAIMER_TEXT } from "../shared/disclaimer.js";
import { COPY_FEEDBACK_FLASH_MS } from "../shared/constants.js";

interface Props {
  change: Change;
  reviewed: boolean;
  onToggleReviewed: (id: string) => void;
  defaultCollapsed?: boolean;
}

/**
 * Plain-text rendering of a SINGLE change, for the per-change "Copy" action
 * (N11) — matches the real deadline-triage workflow of pasting one critical
 * change to a teammate. Pure + deterministic so it is unit-testable. Reports,
 * never advises; carries the canonical disclaimer like the full export.
 */
export function formatChangeForClipboard(c: Change): string {
  const lines: string[] = [];
  const head = c.severity === "CRITICAL" ? `[CRITICAL] ${c.changeType}` : c.changeType;
  lines.push(`${head} — ${c.sectionHeading}`);
  if (c.locationHint) lines.push(c.locationHint);
  for (const r of c.criticalReasons) lines.push(`- ${r}`);
  if (c.beforeText) lines.push(`Prior: ${c.beforeText}`);
  if (c.afterText) lines.push(`New: ${c.afterText}`);
  if (c.clauseInfo) {
    lines.push(`Clause: ${c.clauseInfo.regulation} ${c.clauseInfo.clauseNumber} — ${c.clauseInfo.title}`);
  }
  lines.push("");
  lines.push(DISCLAIMER_TEXT);
  return lines.join("\n");
}

function renderTokenSpans(spans: TokenSpan[]): React.ReactNode {
  // Append a separating space after every span EXCEPT the last —
  // otherwise the rendered text has a stray trailing space (visible
  // on text selection / copy, and a tiny gap before the right border
  // of the container).
  return spans.map((s, i) => {
    const text = i === spans.length - 1 ? s.text : s.text + " ";
    if (s.op === "equal") return <span key={i}>{text}</span>;
    if (s.op === "insert")
      return (
        <span className="ins" key={i}>
          {text}
        </span>
      );
    return (
      <span className="del" key={i}>
        {text}
      </span>
    );
  });
}

function changePreview(c: Change): string {
  const verb =
    c.changeType === "INSERT"
      ? "Added"
      : c.changeType === "DELETE"
        ? "Removed"
        : c.changeType === "MOVE"
          ? "Moved"
          : "Changed";
  const text = c.afterText ?? c.beforeText ?? "";
  const truncated = text.length > 80 ? text.slice(0, 79) + "…" : text;
  return `${verb}: ${truncated}`;
}

export const ChangeCard = React.memo(function ChangeCard({
  change,
  reviewed,
  onToggleReviewed,
  defaultCollapsed = false,
}: Props): React.ReactElement {
  const [expanded, setExpanded] = useState<boolean>(!defaultCollapsed);
  const [sideBySide, setSideBySide] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const onCopy = (): void => {
    const text = formatChangeForClipboard(change);
    const done = (): void => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPY_FEEDBACK_FLASH_MS);
    };
    // navigator.clipboard is the happy path; guard for older/headless envs.
    const clip = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (clip?.writeText) {
      clip.writeText(text).then(done, () => {
        /* a denied clipboard permission is non-fatal; do nothing */
      });
    }
  };
  const canSideBySide =
    change.changeType === "MODIFY" && !!change.beforeText && !!change.afterText;
  return (
    <article
      className={
        "change" +
        (change.severity === "CRITICAL" ? " change--critical" : "") +
        (reviewed ? " change--reviewed" : "")
      }
    >
      <header className="change__header">
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>
            {change.sectionHeading}
          </h3>
          <div className="change__location">{change.locationHint}</div>
        </div>
        <div className="change__badges">
          {change.severity === "CRITICAL" && (
            <span className="change__critical-badge">Critical</span>
          )}
          <span className={`change__type-badge change__type-badge--${change.changeType}`}>
            {change.changeType}
          </span>
        </div>
      </header>

      {change.criticalReasons.length > 0 && (
        <ul className="change__reasons">
          {change.criticalReasons.map((r, i) => (
            <li key={i}>• {r}</li>
          ))}
        </ul>
      )}

      {expanded ? (
        <>
          {change.changeType === "MODIFY" && change.tokenSpans && !sideBySide ? (
            <div className="change__tokens">{renderTokenSpans(change.tokenSpans)}</div>
          ) : sideBySide && change.beforeText && change.afterText ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 8,
              }}
            >
              <div className="change__before" style={{ marginBottom: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--delete)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Prior
                </div>
                {change.beforeText}
              </div>
              <div className="change__after">
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--insert)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  New
                </div>
                {change.afterText}
              </div>
            </div>
          ) : change.changeType === "MOVE" && change.beforeText === change.afterText ? (
            // Pure MOVE: same content in two places. Showing the text
            // twice with red/green borders looks like a diff that's
            // actually identical — collapse to a single block.
            change.afterText && <div className="change__after">{change.afterText}</div>
          ) : (
            <>
              {change.beforeText && <div className="change__before">{change.beforeText}</div>}
              {change.afterText && <div className="change__after">{change.afterText}</div>}
            </>
          )}

          {change.clauseInfo && (
            <div className="change__clause">
              <div className="change__clause-title">
                {change.clauseInfo.regulation} {change.clauseInfo.clauseNumber} —{" "}
                {change.clauseInfo.title}
              </div>
              {change.clauseInfo.plainLanguageNote && <div>{change.clauseInfo.plainLanguageNote}</div>}
            </div>
          )}
        </>
      ) : (
        <div className="change__collapsed-summary">{changePreview(change)}</div>
      )}

      <div className="change__footer">
        <button
          className="ghost"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          title={expanded ? "Collapse this change" : "Expand this change"}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
        {expanded && canSideBySide && (
          <button
            className="ghost"
            onClick={() => setSideBySide((v) => !v)}
            aria-pressed={sideBySide}
            title="Toggle side-by-side view"
          >
            {sideBySide ? "Inline diff" : "Side by side"}
          </button>
        )}
        <button
          className="ghost"
          onClick={() => onToggleReviewed(change.id)}
          aria-pressed={reviewed}
          aria-label={reviewed ? "Unmark as reviewed" : "Mark as reviewed"}
          title={reviewed ? "Mark as not reviewed" : "Mark as reviewed"}
        >
          {reviewed ? "✓ Reviewed" : "Mark as reviewed"}
        </button>
        <button
          className="ghost"
          onClick={onCopy}
          title="Copy this change as text (to paste into an email or chat)"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
    </article>
  );
});

import React, { useState } from "react";
import type { Change, TokenSpan } from "../core/diff/types.js";

interface Props {
  change: Change;
  reviewed: boolean;
  onToggleReviewed: () => void;
  defaultCollapsed?: boolean;
}

function renderTokenSpans(spans: TokenSpan[]): React.ReactNode {
  return spans.map((s, i) => {
    if (s.op === "equal") return <span key={i}>{s.text + " "}</span>;
    if (s.op === "insert")
      return (
        <span className="ins" key={i}>
          {s.text + " "}
        </span>
      );
    return (
      <span className="del" key={i}>
        {s.text + " "}
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

export function ChangeCard({
  change,
  reviewed,
  onToggleReviewed,
  defaultCollapsed = false,
}: Props): React.ReactElement {
  const [expanded, setExpanded] = useState<boolean>(!defaultCollapsed);
  return (
    <article
      className={
        "change" +
        (change.severity === "CRITICAL" ? " change--critical" : "") +
        (reviewed ? " change--reviewed" : "")
      }
      tabIndex={0}
      aria-expanded={expanded}
    >
      <header className="change__header">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{change.sectionHeading}</div>
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
          {change.changeType === "MODIFY" && change.tokenSpans ? (
            <div className="change__tokens">{renderTokenSpans(change.tokenSpans)}</div>
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
        <button className="ghost" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Collapse" : "Expand"}
        </button>
        <button
          className="ghost"
          onClick={onToggleReviewed}
          aria-pressed={reviewed}
          title={reviewed ? "Mark as not reviewed" : "Mark as reviewed"}
        >
          {reviewed ? "✓ Reviewed" : "Mark reviewed"}
        </button>
      </div>
    </article>
  );
}

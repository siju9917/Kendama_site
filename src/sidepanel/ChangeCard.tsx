import React from "react";
import type { Change, TokenSpan } from "../core/diff/types.js";

interface Props {
  change: Change;
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

export function ChangeCard({ change }: Props): React.ReactElement {
  return (
    <article className={"change " + (change.severity === "CRITICAL" ? "change--critical" : "")}>
      <header className="change__header">
        <div>
          <div style={{ fontWeight: 600 }}>{change.sectionHeading}</div>
          <div className="change__location">{change.locationHint}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          {change.severity === "CRITICAL" && <span className="change__critical-badge">Critical</span>}
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
            {change.clauseInfo.regulation} {change.clauseInfo.clauseNumber} — {change.clauseInfo.title}
          </div>
          {change.clauseInfo.plainLanguageNote && <div>{change.clauseInfo.plainLanguageNote}</div>}
        </div>
      )}
    </article>
  );
}

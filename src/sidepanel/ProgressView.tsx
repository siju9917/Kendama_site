import React from "react";

export function ProgressView({
  note,
  percent,
}: {
  note: string;
  percent: number;
}): React.ReactElement {
  return (
    <div role="status" aria-live="polite">
      <div style={{ fontWeight: 600 }}>{note || "Working…"}</div>
      <div
        className="progressbar"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Diff progress"
      >
        <div
          className="progressbar__fill"
          style={{ width: `${Math.min(100, Math.max(4, percent))}%` }}
        />
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: "90%", marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: "75%" }} />
      </div>
    </div>
  );
}

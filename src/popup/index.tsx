import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { DiffStorage } from "../core/storage/index.js";
import type { DiffSummary } from "../core/interfaces.js";

function Popup(): React.ReactElement {
  const [recent, setRecent] = useState<DiffSummary[]>([]);
  useEffect(() => {
    new DiffStorage().listDiffs().then(setRecent).catch(() => setRecent([]));
  }, []);

  const openSidePanel = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (globalThis as any).chrome;
    if (api?.sidePanel?.open) {
      api.windows.getCurrent((w: { id: number }) => {
        api.sidePanel.open({ windowId: w.id });
        window.close();
      });
    }
  };

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>BidDiff</div>
      <p style={{ color: "var(--fg-muted)", marginTop: 0 }}>
        Federal solicitation amendment diff.
      </p>
      <button className="primary" style={{ width: "100%" }} onClick={openSidePanel}>
        Open side panel
      </button>
      <div style={{ marginTop: 16, fontSize: 12, color: "var(--fg-muted)" }}>
        Recent diffs ({recent.length})
      </div>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
        {recent.slice(0, 5).map((s) => (
          <li key={s.id} style={{ padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 600 }}>{s.solicitationId ?? s.currentFileName}</div>
            <div style={{ color: "var(--fg-muted)", fontSize: 11 }}>
              {s.totalChanges} changes
              {s.criticalCount > 0 ? ` · ${s.criticalCount} critical` : ""}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);

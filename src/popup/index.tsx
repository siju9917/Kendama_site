import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { DiffStorage, makeKv } from "../core/storage/index.js";
import type { DiffSummary } from "../core/interfaces.js";
import { openOptionsPage } from "../shared/chrome-rt.js";

/**
 * Key the side panel reads at mount to auto-open a specific saved
 * diff. The popup writes it before opening the panel; the panel
 * reads + clears it on mount.
 */
const PENDING_OPEN_DIFF_ID_KEY = "biddiff.pendingOpenDiffId";

function Popup(): React.ReactElement {
  const [recent, setRecent] = useState<DiffSummary[]>([]);
  const [openError, setOpenError] = useState<string | null>(null);
  useEffect(() => {
    new DiffStorage().listDiffs().then(setRecent).catch(() => setRecent([]));
  }, []);

  const openSidePanel = async (pendingDiffId?: string): Promise<void> => {
    if (typeof chrome === "undefined" || !chrome.sidePanel?.open) {
      setOpenError("Side panel API not available — update Chrome to 114+.");
      return;
    }
    // sidePanel.open needs a user gesture. The gesture survives short
    // sync work but is consumed by an `await`, so fire the storage
    // write WITHOUT awaiting it and rely on chrome.storage's internal
    // serialization (the panel's mount-time read happens after the
    // write completes).
    const kv = makeKv();
    if (pendingDiffId) {
      kv.set(PENDING_OPEN_DIFF_ID_KEY, pendingDiffId).catch(() => {});
    }
    try {
      const w = await chrome.windows.getCurrent();
      if (typeof w?.id !== "number") {
        // Clear the pending id — otherwise it'd fire on the NEXT
        // panel open, which the user didn't request.
        if (pendingDiffId) kv.remove(PENDING_OPEN_DIFF_ID_KEY).catch(() => {});
        setOpenError("Couldn't find the current window.");
        return;
      }
      await chrome.sidePanel.open({ windowId: w.id });
      window.close();
    } catch {
      if (pendingDiffId) kv.remove(PENDING_OPEN_DIFF_ID_KEY).catch(() => {});
      setOpenError("Couldn't open the side panel. Click the BidDiff icon in the toolbar instead.");
    }
  };

  return (
    <div>
      <h1 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, marginTop: 0 }}>BidDiff</h1>
      <p style={{ color: "var(--fg-muted)", marginTop: 0 }}>
        Federal solicitation amendment diff.
      </p>
      <button
        className="primary"
        style={{ width: "100%" }}
        onClick={() => void openSidePanel()}
      >
        Open side panel
      </button>
      {/* sidePanel.open requires a USER gesture in Chrome — calling it
         from an async chain that's already awaited a non-trivial promise
         can throw "must be called from a user gesture". We do the
         storage write first, then the gesture-driven open in the same
         click handler, to keep both inside the gesture window. */}
      {openError && (
        <div className="error" role="alert" style={{ marginTop: 12 }}>
          {openError}
        </div>
      )}
      {recent.length > 0 && (
        <>
          <h2
            style={{
              marginTop: 16,
              marginBottom: 0,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {recent.length > 5 ? `Recent diffs (5 of ${recent.length})` : `Recent diffs (${recent.length})`}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
            {recent.slice(0, 5).map((s) => (
              <li key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <button
                  onClick={() => void openSidePanel(s.id)}
                  title={`Open: ${s.solicitationId ?? s.currentFileName}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: "0",
                    padding: "8px 6px",
                    font: "inherit",
                    cursor: "pointer",
                    color: "inherit",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.solicitationId ?? s.currentFileName}
                  </div>
                  <div style={{ color: "var(--fg-muted)", fontSize: 11 }}>
                    {s.totalChanges} changes
                    {s.criticalCount > 0 ? ` · ${s.criticalCount} critical` : ""}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <button
        onClick={openOptionsPage}
        style={{
          marginTop: 16,
          background: "transparent",
          border: "0",
          padding: "6px 0",
          color: "var(--accent)",
          font: "inherit",
          cursor: "pointer",
          textDecoration: "underline",
          fontSize: 12,
        }}
      >
        Settings
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);

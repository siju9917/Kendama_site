import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { makeKv } from "../core/storage/index.js";

function Options(): React.ReactElement {
  const kv = useMemo(() => makeKv(), []);
  const [status, setStatus] = useState("");
  const [clearing, setClearing] = useState(false);

  const clearHistory = async (): Promise<void> => {
    if (clearing) return;
    const { DiffStorage } = await import("../core/storage/index.js");
    const s = new DiffStorage();
    const list = await s.listDiffs();
    if (list.length === 0) {
      setStatus("Nothing to clear.");
      setTimeout(() => setStatus(""), 1500);
      return;
    }
    // Explicit confirmation. There is no undo.
    const ok = window.confirm(
      `Permanently delete ${list.length} saved ${list.length === 1 ? "diff" : "diffs"}? This cannot be undone.`,
    );
    if (!ok) return;
    setClearing(true);
    setStatus(`Clearing ${list.length}…`);
    const { clearStoredDiffs } = await import("./clearHistory.js");
    const { deleted, failed } = await clearStoredDiffs(s, kv, list);
    setClearing(false);
    if (failed === 0) {
      setStatus(`Cleared ${deleted} ${deleted === 1 ? "diff" : "diffs"}.`);
    } else {
      setStatus(`Cleared ${deleted} of ${list.length}; ${failed} failed.`);
    }
    setTimeout(() => setStatus(""), 2500);
  };

  return (
    <div>
      <h1 style={{ fontSize: 18 }}>BidDiff Settings</h1>
      <p style={{ color: "var(--fg-muted)" }}>
        BidDiff is free and runs entirely on your device. There are no accounts,
        license keys, or telemetry — your documents never leave your machine.
      </p>

      <div className="option">
        <h2>Clear stored diff history</h2>
        <button
          onClick={() => {
            clearHistory().catch(() => {
              setStatus("Clear failed — check extension storage permission.");
              setTimeout(() => setStatus(""), 2500);
            });
          }}
          disabled={clearing}
        >
          {clearing ? "Clearing…" : "Clear history"}
        </button>
      </div>

      <div className="option">
        <h2>Disclaimer</h2>
        <p style={{ color: "var(--fg-muted)", fontSize: 12, marginTop: 0 }}>
          The disclaimer banner can be hidden from the side panel. Restore it here.
        </p>
        <button
          onClick={() => {
            kv.remove("biddiff.disclaimer.dismissed")
              .then(() => setStatus("Disclaimer will appear again next time the side panel opens."))
              .catch(() => setStatus("Couldn't restore disclaimer — check storage permission."))
              .finally(() => {
                setTimeout(() => setStatus(""), 2500);
              });
          }}
        >
          Show disclaimer again
        </button>
      </div>

      <div className="option">
        <h2>Reset onboarding</h2>
        <button
          onClick={() => {
            Promise.all([
              kv.remove("biddiff.onboarding.seen"),
              kv.remove("biddiff.tip.kbd.seen"),
            ])
              .then(() => setStatus("Onboarding will appear again next time the side panel opens."))
              .catch(() => setStatus("Couldn't reset onboarding — check storage permission."))
              .finally(() => {
                setTimeout(() => setStatus(""), 2500);
              });
          }}
        >
          Reset onboarding
        </button>
      </div>

      <div
        role="status"
        aria-live="polite"
        style={{ color: "var(--fg-muted)", fontSize: 12, marginTop: 16, minHeight: 18 }}
      >
        {status}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Options />);

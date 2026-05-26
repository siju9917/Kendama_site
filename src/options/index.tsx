import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { makeKv } from "../core/storage/index.js";

const SETTINGS_KEY = "biddiff.settings";

interface Settings {
  licenseKey: string;
  allowAnonymousTelemetry: boolean;
}

const DEFAULTS: Settings = {
  licenseKey: "",
  allowAnonymousTelemetry: true,
};

function Options(): React.ReactElement {
  const kv = useMemo(() => makeKv(), []);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [status, setStatus] = useState("");
  useEffect(() => {
    kv.get<Settings>(SETTINGS_KEY).then((s) => setSettings(s ?? DEFAULTS));
  }, [kv]);

  const save = async (next: Settings): Promise<void> => {
    setSettings(next);
    await kv.set(SETTINGS_KEY, next);
    setStatus("Saved.");
    setTimeout(() => setStatus(""), 1500);
  };

  const clearHistory = async (): Promise<void> => {
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
    for (const e of list) {
      await s.deleteDiff(e.id);
    }
    // Belt-and-suspenders: drop the index key too.
    await kv.remove("biddiff.diffs.index");
    setStatus(`Cleared ${list.length} ${list.length === 1 ? "diff" : "diffs"}.`);
    setTimeout(() => setStatus(""), 2500);
  };

  return (
    <div>
      <h1 style={{ fontSize: 18 }}>BidDiff Settings</h1>
      <p style={{ color: "var(--fg-muted)" }}>
        BidDiff processes documents on your device. None of your document content is sent
        to any server except the optional server OCR path, which requires per-document consent.
      </p>

      <div className="option">
        <h2>License key</h2>
        <input
          type="text"
          value={settings.licenseKey}
          onChange={(e) => save({ ...settings, licenseKey: e.target.value })}
          placeholder="Paste license key (or leave blank for trial)"
          style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border-strong)" }}
        />
      </div>

      <div className="option">
        <h2>Anonymous usage statistics</h2>
        <label>
          <input
            type="checkbox"
            checked={settings.allowAnonymousTelemetry}
            onChange={(e) => save({ ...settings, allowAnonymousTelemetry: e.target.checked })}
          />{" "}
          Send anonymous usage statistics (counts and error types only — never document content)
        </label>
      </div>

      <div className="option">
        <h2>Clear stored diff history</h2>
        <button onClick={clearHistory}>Clear history</button>
      </div>

      <div className="option">
        <h2>Disclaimer</h2>
        <p style={{ color: "var(--fg-muted)", fontSize: 12, marginTop: 0 }}>
          The disclaimer banner can be hidden from the side panel. Restore it here.
        </p>
        <button
          onClick={async () => {
            await kv.remove("biddiff.disclaimer.dismissed");
            setStatus("Disclaimer will appear again next time the side panel opens.");
            setTimeout(() => setStatus(""), 2500);
          }}
        >
          Show disclaimer again
        </button>
      </div>

      <div className="option">
        <h2>Reset onboarding</h2>
        <button
          onClick={async () => {
            await kv.remove("biddiff.onboarding.seen");
            await kv.remove("biddiff.tip.kbd.seen");
            setStatus("Onboarding will appear again next time the side panel opens.");
            setTimeout(() => setStatus(""), 2500);
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

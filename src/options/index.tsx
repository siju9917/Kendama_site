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
    // Walk every index entry and delete its payload (chrome.storage OR
    // IndexedDB) before nuking the index. Avoids orphan payloads that
    // would otherwise live forever and count against storage quota.
    const { DiffStorage } = await import("../core/storage/index.js");
    const s = new DiffStorage();
    const list = await s.listDiffs();
    for (const e of list) {
      await s.deleteDiff(e.id);
    }
    // Belt-and-suspenders: drop the index key too.
    await kv.remove("biddiff.diffs.index");
    setStatus("History cleared.");
    setTimeout(() => setStatus(""), 1500);
  };

  return (
    <div>
      <h1 style={{ fontSize: 18 }}>BidDiff Settings</h1>
      <p style={{ color: "var(--fg-muted)" }}>
        BidDiff processes documents on your device. None of your document content is sent
        to any server except the optional server OCR path, which requires per-document consent.
      </p>

      <div className="option">
        <h3>License key</h3>
        <input
          type="text"
          value={settings.licenseKey}
          onChange={(e) => save({ ...settings, licenseKey: e.target.value })}
          placeholder="Paste license key (or leave blank for trial)"
          style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border-strong)" }}
        />
      </div>

      <div className="option">
        <h3>Anonymous usage statistics</h3>
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
        <h3>Clear stored diff history</h3>
        <button onClick={clearHistory}>Clear history</button>
      </div>

      <div className="option">
        <h3>Disclaimer</h3>
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
        <h3>Reset onboarding</h3>
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

      <div style={{ color: "var(--fg-muted)", fontSize: 12, marginTop: 16 }}>{status}</div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Options />);

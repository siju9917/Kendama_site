import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const [clearing, setClearing] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    kv.get<Settings>(SETTINGS_KEY)
      .then((s) => setSettings(s ?? DEFAULTS))
      .catch(() => setSettings(DEFAULTS));
  }, [kv]);
  // Flush any pending save on unmount so a fast close doesn't lose input.
  // We can't await in a cleanup, but kv.set returns a Promise that the
  // chrome.storage API queues to disk; firing it before clearing the
  // timer ensures the latest value is persisted.
  const pendingSettingsRef = useRef<Settings | null>(null);
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        if (pendingSettingsRef.current) {
          kv.set(SETTINGS_KEY, pendingSettingsRef.current).catch(() => {});
        }
      }
    };
  }, [kv]);

  /**
   * Update state synchronously, then persist to chrome.storage after a
   * short debounce. Typing into the license key field used to fire one
   * storage write per character.
   */
  const save = (next: Settings, debounceMs = 250): void => {
    setSettings(next);
    pendingSettingsRef.current = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      pendingSettingsRef.current = null;
      void (async () => {
        try {
          await kv.set(SETTINGS_KEY, next);
          setStatus("Saved.");
        } catch {
          setStatus("Save failed — check extension storage permission.");
        }
        setTimeout(() => setStatus(""), 2500);
      })();
    }, debounceMs);
  };

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
    let deleted = 0;
    let failed = 0;
    for (const e of list) {
      try {
        await s.deleteDiff(e.id);
        deleted++;
      } catch {
        failed++;
      }
    }
    // Belt-and-suspenders: drop the index key too.
    await kv.remove("biddiff.diffs.index").catch(() => {});
    // Any stale popup→panel "open this diff" pointer would now resolve
    // to a missing payload and surface as a spurious "no longer
    // available" error in the side panel on next mount.
    await kv.remove("biddiff.pendingOpenDiffId").catch(() => {});
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
        BidDiff processes documents on your device. None of your document content is sent
        to any server except the optional server OCR path, which requires per-document consent.
      </p>

      <div className="option">
        <h2>License key</h2>
        <input
          type="text"
          autoComplete="off"
          spellCheck={false}
          aria-label="License key"
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
            onChange={(e) =>
              save({ ...settings, allowAnonymousTelemetry: e.target.checked }, 0)
            }
          />{" "}
          Send anonymous usage statistics (counts and error types only — never document content)
        </label>
      </div>

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

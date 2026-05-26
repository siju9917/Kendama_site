/**
 * Side panel — the main workspace.
 *
 * Flow:
 *   1. Empty state — user drops the current and prior amendment files,
 *      or opens a saved diff from history.
 *   2. Loading state — extract + diff is running.
 *   3. Diff state — categorized changes with critical-flagged.
 *   4. Error state — typed ExtractionError shown with userMessage.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { DiffResult } from "../core/diff/types.js";
import { runDiffPipeline } from "./pipeline.js";
import { ChangeCard } from "./ChangeCard.js";
import { Summary } from "./Summary.js";
import { FilePicker } from "./FilePicker.js";
import { History } from "./History.js";
import { SamAttachments } from "./SamAttachments.js";
import { DISCLAIMER_TEXT } from "../shared/disclaimer.js";
import { DiffStorage } from "../core/storage/index.js";
import { LocalLicenseClient } from "../core/licensing/client.js";
import type { LicenseState, OpportunityAttachment } from "../core/interfaces.js";

async function downloadAttachmentAsFile(a: OpportunityAttachment): Promise<File> {
  const resp = await fetch(a.url);
  if (!resp.ok) throw new Error(`download failed (${resp.status})`);
  const blob = await resp.blob();
  return new File([blob], a.fileName, {
    type: blob.type || a.mimeType || "application/octet-stream",
  });
}

type Phase = "EMPTY" | "RUNNING" | "DONE" | "ERROR";

interface UiState {
  phase: Phase;
  result: DiffResult | null;
  error: string | null;
  loadingNote: string;
}

const INITIAL_STATE: UiState = {
  phase: "EMPTY",
  result: null,
  error: null,
  loadingNote: "",
};

function FilePickerWithSam({ onRun }: { onRun: (a: File, b: File) => void }): React.ReactElement {
  const [pending, setPending] = useState<{ current?: File; prior?: File }>({});
  const [error, setError] = useState<string | null>(null);

  const onChoose = async (slot: "current" | "prior", a: OpportunityAttachment): Promise<void> => {
    setError(null);
    try {
      const file = await downloadAttachmentAsFile(a);
      const next = { ...pending, [slot]: file };
      setPending(next);
      if (next.current && next.prior) onRun(next.current, next.prior);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <FilePicker onRun={onRun} />
      {error && (
        <div className="error" role="alert">
          Couldn't download: {error}
        </div>
      )}
      <SamAttachments
        onChooseCurrent={(a) => onChoose("current", a)}
        onChoosePrior={(a) => onChoose("prior", a)}
      />
    </>
  );
}

function LicenseChip({ license }: { license: LicenseState | null }): React.ReactElement | null {
  if (!license) return null;
  let label = "";
  if (license.tier === "trial" && license.status === "active") {
    label = `Trial — ${license.trialDaysLeft ?? 0} days left`;
  } else if (license.status === "active") {
    label = `${license.tier} — active`;
  } else if (license.status === "grace") {
    label = "Trial expired — grace period";
  } else if (license.status === "expired") {
    label = "Trial expired — subscribe to continue";
  } else {
    label = `License ${license.status}`;
  }
  return (
    <span
      style={{
        fontSize: 11,
        color: "var(--fg-muted)",
        marginLeft: 8,
        padding: "2px 8px",
        background: "var(--bg-subtle)",
        borderRadius: 999,
      }}
    >
      {label}
    </span>
  );
}

export function App(): React.ReactElement {
  const [state, setState] = useState<UiState>(INITIAL_STATE);
  const [filter, setFilter] = useState<"ALL" | "CRITICAL">("ALL");
  const [license, setLicense] = useState<LicenseState | null>(null);
  const storage = useMemo(() => new DiffStorage(), []);

  useEffect(() => {
    new LocalLicenseClient().validate().then(setLicense).catch(() => setLicense(null));
  }, []);

  const persistDiff = useCallback(
    async (result: DiffResult) => {
      try {
        await storage.saveDiff(result);
      } catch (e) {
        console.warn("save failed:", e);
      }
    },
    [storage],
  );

  const onRun = useCallback(
    async (currentFile: File, priorFile: File) => {
      setState({
        phase: "RUNNING",
        result: null,
        error: null,
        loadingNote: "Reading documents…",
      });
      try {
        const result = await runDiffPipeline(currentFile, priorFile, (note) => {
          setState((s) => ({ ...s, loadingNote: note }));
        });
        await persistDiff(result);
        setState({ phase: "DONE", result, error: null, loadingNote: "" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userMessage = (e as any)?.userMessage ?? msg;
        setState({ phase: "ERROR", result: null, error: userMessage, loadingNote: "" });
      }
    },
    [persistDiff],
  );

  const onOpenSaved = useCallback(
    async (id: string) => {
      const r = await storage.getDiff(id);
      if (r) setState({ phase: "DONE", result: r, error: null, loadingNote: "" });
    },
    [storage],
  );

  const onReset = useCallback(() => {
    setState(INITIAL_STATE);
    setFilter("ALL");
  }, []);

  const filteredChanges = useMemo(() => {
    if (!state.result) return [];
    if (filter === "ALL") return state.result.changes;
    return state.result.changes.filter((c) => c.severity === "CRITICAL");
  }, [state.result, filter]);

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__title">BidDiff</span>
        <span className="app__subtitle">Federal solicitation amendment diff</span>
        <LicenseChip license={license} />
        {state.phase !== "EMPTY" && (
          <button onClick={onReset} style={{ marginLeft: "auto" }}>
            Start over
          </button>
        )}
      </header>

      <main className="app__body">
        <p className="disclaimer">{DISCLAIMER_TEXT}</p>

        {state.phase === "EMPTY" && (
          <>
            <FilePickerWithSam onRun={onRun} />
            <History storage={storage} onOpen={onOpenSaved} />
          </>
        )}

        {state.phase === "RUNNING" && (
          <div className="empty" role="status" aria-live="polite">
            <div className="spinner" aria-hidden="true" /> {state.loadingNote || "Working…"}
          </div>
        )}

        {state.phase === "ERROR" && state.error && (
          <div className="error" role="alert">
            <strong>Could not diff these documents.</strong>
            <div>{state.error}</div>
          </div>
        )}

        {state.phase === "DONE" && state.result && (
          <>
            <Summary result={state.result} />
            <div className="filters">
              <button
                className={`filter-chip ${filter === "ALL" ? "filter-chip--active" : ""}`}
                onClick={() => setFilter("ALL")}
              >
                All changes ({state.result.changes.length})
              </button>
              <button
                className={`filter-chip ${filter === "CRITICAL" ? "filter-chip--active" : ""}`}
                onClick={() => setFilter("CRITICAL")}
              >
                Critical ({state.result.criticalCount})
              </button>
            </div>
            {filteredChanges.length === 0 && (
              <div className="empty">No changes match the current filter.</div>
            )}
            {filteredChanges.map((c) => (
              <ChangeCard key={c.id} change={c} />
            ))}
          </>
        )}
      </main>

      <footer className="footer">
        Processed on your device. BidDiff assists professional review; it does not replace it.
      </footer>
    </div>
  );
}

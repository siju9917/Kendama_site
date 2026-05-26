/**
 * Side panel — the main workspace.
 *
 * Flow:
 *   1. Empty state — user drops the current and prior amendment files.
 *   2. Loading state — extract + diff is running.
 *   3. Diff state — categorized changes with critical-flagged.
 *   4. Error state — typed ExtractionError shown with userMessage.
 */
import React, { useCallback, useMemo, useState } from "react";
import type { DiffResult } from "../core/diff/types.js";
import { runDiffPipeline } from "./pipeline.js";
import { ChangeCard } from "./ChangeCard.js";
import { Summary } from "./Summary.js";
import { FilePicker } from "./FilePicker.js";
import { DISCLAIMER_TEXT } from "../shared/disclaimer.js";

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

export function App(): React.ReactElement {
  const [state, setState] = useState<UiState>(INITIAL_STATE);
  const [filter, setFilter] = useState<"ALL" | "CRITICAL">("ALL");

  const onRun = useCallback(async (currentFile: File, priorFile: File) => {
    setState({ phase: "RUNNING", result: null, error: null, loadingNote: "Reading documents…" });
    try {
      const result = await runDiffPipeline(currentFile, priorFile, (note) => {
        setState((s) => ({ ...s, loadingNote: note }));
      });
      setState({ phase: "DONE", result, error: null, loadingNote: "" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Prefer userMessage when an ExtractionError is thrown.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userMessage = (e as any)?.userMessage ?? msg;
      setState({ phase: "ERROR", result: null, error: userMessage, loadingNote: "" });
    }
  }, []);

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
        {state.phase !== "EMPTY" && (
          <button onClick={onReset} style={{ marginLeft: "auto" }}>
            Start over
          </button>
        )}
      </header>

      <main className="app__body">
        <p className="disclaimer">{DISCLAIMER_TEXT}</p>

        {state.phase === "EMPTY" && <FilePicker onRun={onRun} />}

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

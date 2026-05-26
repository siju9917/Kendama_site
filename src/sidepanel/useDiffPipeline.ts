/**
 * useDiffPipeline — the React hook that drives the side-panel state
 * machine. Pulled out of App.tsx so the App component is small enough to
 * read at a glance.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DiffResult } from "../core/diff/types.js";
import { prewarmPipeline, runDiffPipeline } from "./pipeline.js";
import { DiffStorage } from "../core/storage/index.js";
import { noteDiffSucceeded } from "./ReviewPrompt.js";

export type Phase = "EMPTY" | "RUNNING" | "DONE" | "ERROR";

export interface UiState {
  phase: Phase;
  result: DiffResult | null;
  error: string | null;
  loadingNote: string;
  loadingPercent: number;
}

const INITIAL_STATE: UiState = {
  phase: "EMPTY",
  result: null,
  error: null,
  loadingNote: "",
  loadingPercent: 0,
};

export function useDiffPipeline(): {
  state: UiState;
  storage: DiffStorage;
  run: (current: File, prior: File) => Promise<void>;
  openSaved: (id: string) => Promise<void>;
  reset: () => void;
} {
  const [state, setState] = useState<UiState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);
  // useMemo gives us a stable instance without the if-block init pattern.
  const storage = useMemo(() => new DiffStorage(), []);

  useEffect(() => {
    // Prewarm the heavy import graph (PDF.js, diff engine, extractors)
    // shortly after mount — first-diff latency drops noticeably.
    const t = setTimeout(prewarmPipeline, 50);
    return () => {
      clearTimeout(t);
      abortRef.current?.abort();
    };
  }, []);

  const run = useCallback(
    async (currentFile: File, priorFile: File): Promise<void> => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setState({
        phase: "RUNNING",
        result: null,
        error: null,
        loadingNote: "Reading documents…",
        loadingPercent: 5,
      });
      try {
        const result = await runDiffPipeline(
          currentFile,
          priorFile,
          (note, percent) => {
            setState((s) => ({
              ...s,
              loadingNote: note,
              loadingPercent: percent ?? s.loadingPercent,
            }));
          },
          ctrl.signal,
        );
        if (ctrl.signal.aborted) return;
        try {
          await storage.saveDiff(result);
        } catch (e) {
          console.warn("save failed:", e);
        }
        // .catch swallows so a transient storage error in the review
        // counter doesn't surface as an unhandled rejection.
        noteDiffSucceeded().catch(() => {});
        setState({
          phase: "DONE",
          result,
          error: null,
          loadingNote: "",
          loadingPercent: 100,
        });
      } catch (e) {
        if (ctrl.signal.aborted) return;
        const msg = e instanceof Error ? e.message : String(e);
        const userMessage = (e as { userMessage?: string })?.userMessage ?? msg;
        setState({
          phase: "ERROR",
          result: null,
          error: userMessage,
          loadingNote: "",
          loadingPercent: 0,
        });
      }
    },
    [storage],
  );

  const openSaved = useCallback(
    async (id: string): Promise<void> => {
      try {
        const r = await storage.getDiff(id);
        if (r) {
          await storage.markViewed(id);
          setState({
            phase: "DONE",
            result: r,
            error: null,
            loadingNote: "",
            loadingPercent: 100,
          });
        } else {
          // Entry was in the index but the payload is gone — either
          // deleted from another tab or the IDB store was cleared.
          // Without this branch the user clicks the row and nothing
          // happens, which feels broken.
          setState({
            phase: "ERROR",
            result: null,
            error: "That saved diff is no longer available. Try removing it from history.",
            loadingNote: "",
            loadingPercent: 0,
          });
        }
      } catch (e) {
        // Corrupt stored payload (JSON parse error, schema mismatch,
        // missing fields). Surface as an error rather than crashing the
        // side panel — and offer to remove the bad entry.
        const msg = e instanceof Error ? e.message : String(e);
        setState({
          phase: "ERROR",
          result: null,
          error: `Couldn't open that saved diff (${msg}). Try deleting it from history.`,
          loadingNote: "",
          loadingPercent: 0,
        });
      }
    },
    [storage],
  );

  const reset = useCallback((): void => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  return { state, storage, run, openSaved, reset };
}

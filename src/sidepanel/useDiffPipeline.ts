/**
 * useDiffPipeline — the React hook that drives the side-panel state
 * machine. Pulled out of App.tsx so the App component is small enough to
 * read at a glance.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DiffResult } from "../core/diff/types.js";
import { prewarmPipeline, runDiffPipeline } from "./pipeline.js";
import { DiffStorage, makeKv } from "../core/storage/index.js";
import { noteDiffSucceeded } from "./ReviewPrompt.js";

function markOnboardingSeen(): void {
  // Fire-and-forget; key matches Onboarding's SEEN_KEY.
  makeKv()
    .set("biddiff.onboarding.seen", true)
    .catch(() => {});
}

/** The popup writes this key when the user clicks a recent-diffs item.
 *  We read + clear it on side panel mount and auto-open the diff. */
const PENDING_OPEN_DIFF_ID_KEY = "biddiff.pendingOpenDiffId";

export type Phase = "EMPTY" | "RUNNING" | "DONE" | "ERROR";

export interface UiState {
  phase: Phase;
  result: DiffResult | null;
  error: string | null;
  loadingNote: string;
  loadingPercent: number;
  /**
   * Session-only notices about the diff itself — not part of the
   * engine's result.warnings (those describe extraction issues and
   * are included in exports). saveFailed lives here so we can warn
   * the user that this diff isn't in History, without that note
   * bleeding into the exported PDF / Markdown / clipboard summary.
   */
  sessionNotices: string[];
}

const INITIAL_STATE: UiState = {
  phase: "EMPTY",
  result: null,
  error: null,
  loadingNote: "",
  loadingPercent: 0,
  sessionNotices: [],
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

  // openSaved is defined below; capture via ref so the mount-time and
  // storage-onChanged effects can call it without taking it as a dep.
  const openSavedRef = useRef<((id: string) => Promise<void>) | null>(null);

  useEffect(() => {
    // Trigger paths for the popup → side panel "open this diff" flow:
    //
    //   1. Panel was CLOSED when the popup clicked: panel mounts fresh,
    //      reads PENDING_OPEN_DIFF_ID_KEY here, opens the diff.
    //   2. Panel was already OPEN: chrome.storage.onChanged fires when
    //      the popup writes the key — the listener picks it up.
    //
    // Either way, clear the key after reading so a stale value can't
    // fire on subsequent mounts.
    const kv = makeKv();
    const consume = (id: unknown): void => {
      if (typeof id !== "string" || id.length === 0) return;
      kv.remove(PENDING_OPEN_DIFF_ID_KEY).catch(() => {});
      void openSavedRef.current?.(id);
    };
    kv.get<string>(PENDING_OPEN_DIFF_ID_KEY).then(consume).catch(() => {});

    if (typeof chrome === "undefined" || !chrome.storage?.onChanged?.addListener) {
      return;
    }
    const listener = (
      changes: { [key: string]: { newValue?: unknown } },
      area: string,
    ): void => {
      if (area !== "local") return;
      const c = changes[PENDING_OPEN_DIFF_ID_KEY];
      if (c) consume(c.newValue);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
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
        sessionNotices: [],
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
        const sessionNotices: string[] = [];
        try {
          await storage.saveDiff(result);
        } catch (e) {
          console.warn("save failed:", e);
          // Session notice (not result.warnings) so this stays out of
          // the exported PDF / Markdown — the export audience doesn't
          // care that local persistence failed for this viewer.
          sessionNotices.push(
            "Couldn't save this diff to history (local storage may be full).",
          );
        }
        // .catch swallows so a transient storage error in the review
        // counter doesn't surface as an unhandled rejection.
        noteDiffSucceeded().catch(() => {});
        // After the first successful diff, treat onboarding as seen —
        // otherwise the user re-sees the "Welcome to BidDiff" card on
        // every Start over until they explicitly dismiss it.
        markOnboardingSeen();
        setState({
          phase: "DONE",
          result,
          error: null,
          loadingNote: "",
          loadingPercent: 100,
          sessionNotices,
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
          sessionNotices: [],
        });
      }
    },
    [storage],
  );

  const openSaved = useCallback(
    async (id: string): Promise<void> => {
      // Abort any in-flight diff so its later setState DONE doesn't
      // overwrite the saved diff we're about to load.
      abortRef.current?.abort();
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
            sessionNotices: [],
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
            sessionNotices: [],
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
          sessionNotices: [],
        });
      }
    },
    [storage],
  );
  // Keep the ref in sync so the mount-time effect above can call it.
  openSavedRef.current = openSaved;

  const reset = useCallback((): void => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  return { state, storage, run, openSaved, reset };
}

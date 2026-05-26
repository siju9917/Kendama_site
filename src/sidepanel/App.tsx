/**
 * Side panel — the main workspace.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DiffResult } from "../core/diff/types.js";
import { runDiffPipeline } from "./pipeline.js";
import { ChangeCard } from "./ChangeCard.js";
import { Summary } from "./Summary.js";
import { FilePicker } from "./FilePicker.js";
import { History } from "./History.js";
import { Onboarding } from "./Onboarding.js";
import { ReviewPrompt, noteDiffSucceeded } from "./ReviewPrompt.js";
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
  loadingPercent: number;
}

const INITIAL_STATE: UiState = {
  phase: "EMPTY",
  result: null,
  error: null,
  loadingNote: "",
  loadingPercent: 0,
};

function LicenseChip({ license }: { license: LicenseState | null }): React.ReactElement | null {
  if (!license) return null;
  let label = "";
  let upgrade = false;
  if (license.tier === "trial" && license.status === "active") {
    label = `Trial · ${license.trialDaysLeft ?? 0}d left`;
    upgrade = (license.trialDaysLeft ?? 0) <= 3;
  } else if (license.status === "active") {
    label = `${license.tier} · active`;
  } else if (license.status === "grace") {
    label = "Trial expired · grace";
    upgrade = true;
  } else if (license.status === "expired") {
    label = "Subscribe to continue";
    upgrade = true;
  } else {
    label = `License ${license.status}`;
    upgrade = true;
  }
  return (
    <span
      style={{
        fontSize: 11,
        color: upgrade ? "var(--critical)" : "var(--fg-muted)",
        marginLeft: 8,
        padding: "2px 8px",
        background: upgrade ? "var(--critical-soft)" : "var(--bg-subtle)",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {upgrade && (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            chrome.runtime?.openOptionsPage?.();
          }}
          style={{ marginLeft: 6, fontWeight: 600 }}
        >
          Upgrade
        </a>
      )}
    </span>
  );
}

function ProgressView({ note, percent }: { note: string; percent: number }): React.ReactElement {
  return (
    <div role="status" aria-live="polite">
      <div style={{ fontWeight: 600 }}>{note || "Working…"}</div>
      <div className="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="progressbar__fill" style={{ width: `${Math.max(4, percent)}%` }} />
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: "90%", marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: "75%" }} />
      </div>
    </div>
  );
}

function FilePickerWithSam({
  onRun,
}: {
  onRun: (a: File, b: File) => void;
}): React.ReactElement {
  const [pending, setPending] = useState<{ current?: File; prior?: File }>({});
  const [error, setError] = useState<string | null>(null);
  const onChoose = async (
    slot: "current" | "prior",
    a: OpportunityAttachment,
  ): Promise<void> => {
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

export function App(): React.ReactElement {
  const [state, setState] = useState<UiState>(INITIAL_STATE);
  const [filter, setFilter] = useState<"ALL" | "CRITICAL">("ALL");
  const [sectionFilter, setSectionFilter] = useState<string | "ALL">("ALL");
  const [textFilter, setTextFilter] = useState<string>("");
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [disclaimerShown, setDisclaimerShown] = useState<boolean>(true);
  const [license, setLicense] = useState<LicenseState | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const filterInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
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
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setReviewed(new Set());
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
            setState((s) => ({ ...s, loadingNote: note, loadingPercent: percent ?? s.loadingPercent }));
          },
          ctrl.signal,
        );
        if (ctrl.signal.aborted) return;
        await persistDiff(result);
        void noteDiffSucceeded();
        setState({ phase: "DONE", result, error: null, loadingNote: "", loadingPercent: 100 });
      } catch (e) {
        if (ctrl.signal.aborted) return;
        const msg = e instanceof Error ? e.message : String(e);
        const userMessage = (e as { userMessage?: string })?.userMessage ?? msg;
        setState({ phase: "ERROR", result: null, error: userMessage, loadingNote: "", loadingPercent: 0 });
      }
    },
    [persistDiff],
  );

  const onOpenSaved = useCallback(
    async (id: string) => {
      const r = await storage.getDiff(id);
      if (r) {
        await storage.markViewed(id);
        setState({ phase: "DONE", result: r, error: null, loadingNote: "", loadingPercent: 100 });
      }
    },
    [storage],
  );

  const onReset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
    setFilter("ALL");
    setSectionFilter("ALL");
    setTextFilter("");
    setReviewed(new Set());
  }, []);

  const availableSections = useMemo(() => {
    if (!state.result) return [] as string[];
    const set = new Set<string>();
    for (const c of state.result.changes) set.add(c.ucfLetter ?? "?");
    return [...set].sort();
  }, [state.result]);

  const filteredChanges = useMemo(() => {
    if (!state.result) return [];
    let out = state.result.changes;
    if (filter === "CRITICAL") out = out.filter((c) => c.severity === "CRITICAL");
    if (sectionFilter !== "ALL") out = out.filter((c) => (c.ucfLetter ?? "?") === sectionFilter);
    const needle = textFilter.trim().toLowerCase();
    if (needle.length > 0) {
      out = out.filter((c) => {
        const hay = [
          c.sectionHeading,
          c.beforeText ?? "",
          c.afterText ?? "",
          c.criticalReasons.join(" "),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      });
    }
    return out;
  }, [state.result, filter, sectionFilter, textFilter]);

  // Keyboard navigation: J / K to move, R to toggle reviewed on focused, / to focus filter.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (state.phase !== "DONE") return;
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(filteredChanges.length - 1, i + 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "r") {
        const c = filteredChanges[focusedIndex];
        if (c) {
          setReviewed((s) => {
            const next = new Set(s);
            if (next.has(c.id)) next.delete(c.id);
            else next.add(c.id);
            return next;
          });
        }
      } else if (e.key === "/") {
        e.preventDefault();
        filterInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.phase, filteredChanges, focusedIndex]);

  // Scroll focused card into view
  useEffect(() => {
    if (state.phase !== "DONE") return;
    const c = filteredChanges[focusedIndex];
    if (!c) return;
    const el = document.querySelector<HTMLElement>(`[data-change-id="${c.id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    el?.focus({ preventScroll: true });
  }, [focusedIndex, state.phase, filteredChanges]);

  const reviewedCount = filteredChanges.filter((c) => reviewed.has(c.id)).length;

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__title">BidDiff</span>
        <span className="app__subtitle">Federal solicitation amendment diff</span>
        <LicenseChip license={license} />
        {state.phase !== "EMPTY" && (
          <button className="ghost" onClick={onReset} style={{ marginLeft: "auto" }}>
            Start over
          </button>
        )}
      </header>

      <main className="app__body">
        {disclaimerShown && (
          <p className="disclaimer">
            {DISCLAIMER_TEXT}
            <button className="disclaimer__toggle" onClick={() => setDisclaimerShown(false)}>
              Hide
            </button>
          </p>
        )}

        {state.phase === "EMPTY" && (
          <>
            <Onboarding />
            <FilePickerWithSam onRun={onRun} />
            <History storage={storage} onOpen={onOpenSaved} />
          </>
        )}

        {state.phase === "RUNNING" && (
          <ProgressView note={state.loadingNote} percent={state.loadingPercent} />
        )}

        {state.phase === "ERROR" && state.error && (
          <div className="error" role="alert">
            <strong>Could not diff these documents.</strong>
            <div>{state.error}</div>
            <div style={{ marginTop: 12 }}>
              <button onClick={onReset}>Try again</button>
            </div>
          </div>
        )}

        {state.phase === "DONE" && state.result && (
          <>
            <ReviewPrompt />
            <Summary result={state.result} />
            <div className="filters">
              <button
                className={`filter-chip ${filter === "ALL" ? "filter-chip--active" : ""}`}
                onClick={() => setFilter("ALL")}
              >
                All ({state.result.changes.length})
              </button>
              <button
                className={`filter-chip ${filter === "CRITICAL" ? "filter-chip--active" : ""}`}
                onClick={() => setFilter("CRITICAL")}
              >
                Critical ({state.result.criticalCount})
              </button>
              {reviewedCount > 0 && (
                <span
                  style={{ fontSize: 12, color: "var(--fg-muted)", alignSelf: "center" }}
                  aria-live="polite"
                >
                  {reviewedCount}/{filteredChanges.length} reviewed
                </span>
              )}
            </div>
            {availableSections.length > 1 && (
              <div className="filters" role="group" aria-label="Section filter">
                <button
                  className={`filter-chip ${sectionFilter === "ALL" ? "filter-chip--active" : ""}`}
                  onClick={() => setSectionFilter("ALL")}
                >
                  All sections
                </button>
                {availableSections.map((s) => (
                  <button
                    key={s}
                    className={`filter-chip ${sectionFilter === s ? "filter-chip--active" : ""}`}
                    onClick={() => setSectionFilter(s)}
                  >
                    Section {s}
                  </button>
                ))}
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <input
                ref={filterInputRef}
                type="search"
                placeholder="Filter by text…  (press / to focus)"
                aria-label="Filter changes by text"
                value={textFilter}
                onChange={(e) => setTextFilter(e.target.value)}
              />
            </div>
            {filteredChanges.length === 0 ? (
              <div className="empty">No changes match the current filter.</div>
            ) : (
              filteredChanges.map((c) => (
                <div key={c.id} data-change-id={c.id}>
                  <ChangeCard
                    change={c}
                    reviewed={reviewed.has(c.id)}
                    onToggleReviewed={() =>
                      setReviewed((s) => {
                        const next = new Set(s);
                        if (next.has(c.id)) next.delete(c.id);
                        else next.add(c.id);
                        return next;
                      })
                    }
                  />
                </div>
              ))
            )}
            <div style={{ color: "var(--fg-faint)", fontSize: 11, marginTop: 16, textAlign: "center" }}>
              Tip: J/K to move between changes · R to mark reviewed · / to focus filter
            </div>
          </>
        )}
      </main>

      <footer className="footer">Processed on your device. BidDiff assists — it does not advise.</footer>
    </div>
  );
}

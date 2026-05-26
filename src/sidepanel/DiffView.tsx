import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Change, DiffResult } from "../core/diff/types.js";
import { makeKv } from "../core/storage/index.js";
import { ChangeCard } from "./ChangeCard.js";
import { ReviewPrompt } from "./ReviewPrompt.js";
import { Summary } from "./Summary.js";

const kv = makeKv(); // module-singleton; safe because makeKv handles both Chrome and Memory backends.

const TIP_SEEN_KEY = "biddiff.tip.kbd.seen";

interface Props {
  result: DiffResult;
}

export function DiffView({ result }: Props): React.ReactElement {
  const [filter, setFilter] = useState<"ALL" | "CRITICAL">("ALL");
  const [sectionFilter, setSectionFilter] = useState<string | "ALL">("ALL");
  const [textFilter, setTextFilter] = useState<string>("");
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const filterInputRef = useRef<HTMLInputElement | null>(null);

  const availableSections = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of result.changes) {
      const k = c.ucfLetter ?? "?";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [result]);

  const filtered: Change[] = useMemo(() => {
    let out = result.changes;
    if (filter === "CRITICAL") out = out.filter((c) => c.severity === "CRITICAL");
    if (sectionFilter !== "ALL")
      out = out.filter((c) => (c.ucfLetter ?? "?") === sectionFilter);
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
  }, [result, filter, sectionFilter, textFilter]);

  // Keep the latest filtered list + focused index in refs so the
  // keydown listener can read them without being re-registered on every
  // keystroke (which would happen if `filtered` was a dep).
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  const focusedIndexRef = useRef(focusedIndex);
  focusedIndexRef.current = focusedIndex;
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      // Skip when any modifier is held so we don't hijack browser
      // shortcuts (Cmd+R reload, Cmd+J downloads, Cmd+/ show shortcuts).
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Skip during IME composition so j/k presses while typing in a
      // non-Latin script don't navigate.
      if (e.isComposing) return;
      const list = filteredRef.current;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(list.length - 1, i + 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "r") {
        const c = list[focusedIndexRef.current];
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
  }, []);

  useEffect(() => {
    const c = filtered[focusedIndex];
    if (!c) return;
    const el = document.querySelector<HTMLElement>(`[data-change-id="${c.id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [focusedIndex, filtered]);

  const reviewedCount = filtered.filter((c) => reviewed.has(c.id)).length;
  const [tipSeen, setTipSeen] = useState<boolean | null>(null);
  useEffect(() => {
    kv.get<boolean>(TIP_SEEN_KEY)
      .then((v) => setTipSeen(!!v))
      .catch(() => setTipSeen(true)); // on read error, suppress the tip
  }, []);
  const dismissTip = (): void => {
    void kv.set(TIP_SEEN_KEY, true);
    setTipSeen(true);
  };
  const hasActiveFilter = filter !== "ALL" || sectionFilter !== "ALL" || textFilter.trim().length > 0;
  const clearFilters = (): void => {
    setFilter("ALL");
    setSectionFilter("ALL");
    setTextFilter("");
  };

  return (
    <>
      <ReviewPrompt />
      {result.warnings.length > 0 && (
        <div className="warning-banner" role="status" aria-live="polite">
          <div className="warning-banner__title">Extraction notes</div>
          <ul className="reset-list" style={{ paddingLeft: 18, margin: 0 }}>
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      <Summary result={result} />
      <div className="filter-bar">
      <div className="filters">
        <button
          className={`filter-chip ${filter === "ALL" ? "filter-chip--active" : ""}`}
          onClick={() => setFilter("ALL")}
        >
          All ({result.changes.length})
        </button>
        <button
          className={`filter-chip ${filter === "CRITICAL" ? "filter-chip--active" : ""}`}
          onClick={() => setFilter("CRITICAL")}
        >
          Critical ({result.criticalCount})
        </button>
        {reviewedCount > 0 && (
          <span className="section-chip-counts" aria-live="polite">
            {reviewedCount}/{filtered.length} reviewed
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
          {availableSections.map(([s, n]) => (
            <button
              key={s}
              className={`filter-chip ${sectionFilter === s ? "filter-chip--active" : ""}`}
              onClick={() => setSectionFilter(s)}
            >
              Section {s} ({n})
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
          autoComplete="off"
          spellCheck={false}
          value={textFilter}
          onChange={(e) => setTextFilter(e.target.value)}
        />
      </div>
      </div>
      {filtered.length === 0 ? (
        <div className="empty">
          <p style={{ marginTop: 0 }}>
            {result.changes.length === 0
              ? "No changes detected. These two versions appear to be identical."
              : "No changes match the current filter."}
          </p>
          {hasActiveFilter && (
            <button onClick={clearFilters}>Clear filters</button>
          )}
        </div>
      ) : (
        filtered.map((c) => (
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
      {tipSeen === false && (
        <div className="tip">
          <span>Tip: J/K to move · R to mark reviewed · / to focus filter</span>
          <button
            className="ghost"
            style={{ fontSize: 11 }}
            onClick={dismissTip}
            aria-label="Dismiss keyboard shortcut tip"
          >
            Got it
          </button>
        </div>
      )}
    </>
  );
}

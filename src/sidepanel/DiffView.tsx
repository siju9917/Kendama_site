import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Change, DiffResult } from "../core/diff/types.js";
import { ChangeCard } from "./ChangeCard.js";
import { ReviewPrompt } from "./ReviewPrompt.js";
import { Summary } from "./Summary.js";

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
    const set = new Set<string>();
    for (const c of result.changes) set.add(c.ucfLetter ?? "?");
    return [...set].sort();
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

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "r") {
        const c = filtered[focusedIndex];
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
  }, [filtered, focusedIndex]);

  useEffect(() => {
    const c = filtered[focusedIndex];
    if (!c) return;
    const el = document.querySelector<HTMLElement>(`[data-change-id="${c.id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [focusedIndex, filtered]);

  const reviewedCount = filtered.filter((c) => reviewed.has(c.id)).length;

  return (
    <>
      <ReviewPrompt />
      <Summary result={result} />
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
          <span
            style={{ fontSize: 12, color: "var(--fg-muted)", alignSelf: "center" }}
            aria-live="polite"
          >
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
      {filtered.length === 0 ? (
        <div className="empty">No changes match the current filter.</div>
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
      <div
        style={{
          color: "var(--fg-faint)",
          fontSize: 11,
          marginTop: 16,
          textAlign: "center",
        }}
      >
        Tip: J/K to move between changes · R to mark reviewed · / to focus filter
      </div>
    </>
  );
}

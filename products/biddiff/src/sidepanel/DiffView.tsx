import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Change, DiffResult } from "../core/diff/types.js";
import { makeKv } from "../core/storage/index.js";
import { ChangeCard } from "./ChangeCard.js";
import { ReviewPrompt } from "./ReviewPrompt.js";
import { Summary } from "./Summary.js";

const kv = makeKv(); // module-singleton; safe because makeKv handles both Chrome and Memory backends.

const TIP_SEEN_KEY = "biddiff.tip.kbd.seen";

/** Returns the index of the change card currently at (or just below) the
 *  top of the viewport — useful when keyboard nav engages after the user
 *  has already mouse-scrolled. -1 if no card is visible. */
function firstVisibleChangeIndex(list: ReadonlyArray<Change>): number {
  if (typeof document === "undefined") return -1;
  for (let i = 0; i < list.length; i++) {
    const el = document.querySelector<HTMLElement>(`[data-change-id="${list[i].id}"]`);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom > 0) return i; // first card that hasn't fully scrolled past
  }
  return -1;
}

/**
 * Stable critical-first ordering (POLISH N9 / Product-Sense P3): critical
 * changes appear first, document order preserved WITHIN each severity group.
 * This makes the store-listing promise ("critical changes flagged at the
 * top") literally true in the default view and matches the export order
 * (`core/export` already lists critical then normal). Pure + stable so the
 * relative order of same-severity changes is unchanged.
 */
export function criticalFirst(changes: ReadonlyArray<Change>): Change[] {
  const critical: Change[] = [];
  const normal: Change[] = [];
  for (const c of changes) {
    (c.severity === "CRITICAL" ? critical : normal).push(c);
  }
  return [...critical, ...normal];
}

interface Props {
  result: DiffResult;
  /** Notices about this viewing session (e.g. save failed). Distinct
   *  from result.warnings, which describe extraction issues and are
   *  included in exports. */
  sessionNotices?: ReadonlyArray<string>;
}

export function DiffView({ result, sessionNotices }: Props): React.ReactElement {
  const [filter, setFilter] = useState<"ALL" | "CRITICAL">("ALL");
  const [sectionFilter, setSectionFilter] = useState<string | "ALL">("ALL");
  const [textFilter, setTextFilter] = useState<string>("");
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  // Track whether the user actually used keyboard nav. Otherwise the
  // focus ring would always show on the first card on mount, which is
  // distracting for mouse-only users.
  const [keyboardNavUsed, setKeyboardNavUsed] = useState<boolean>(false);
  const filterInputRef = useRef<HTMLInputElement | null>(null);

  const availableSections = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of result.changes) {
      const k = c.ucfLetter ?? "?";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    // Sort A..M first, then the "?" (Other) bucket last instead of
    // first (which is where ASCII would put it).
    return [...counts.entries()].sort(([a], [b]) => {
      if (a === "?" && b !== "?") return 1;
      if (b === "?" && a !== "?") return -1;
      return a === b ? 0 : a < b ? -1 : 1;
    });
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
          // Also include clause info so a search for "FAR 52.204-21"
          // or the clause's title catches the change even when the
          // surrounding paragraph doesn't.
          c.clauseInfo?.clauseNumber ?? "",
          c.clauseInfo?.title ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      });
    }
    // Critical-first, document order within each group (POLISH N9). Applied
    // last so it orders whatever the active filters produced.
    return criticalFirst(out);
  }, [result, filter, sectionFilter, textFilter]);

  // Keep the latest filtered list + focused index in refs so the
  // keydown listener can read them without being re-registered on every
  // keystroke (which would happen if `filtered` was a dep).
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  const focusedIndexRef = useRef(focusedIndex);
  focusedIndexRef.current = focusedIndex;
  const keyboardNavUsedRef = useRef(keyboardNavUsed);
  keyboardNavUsedRef.current = keyboardNavUsed;
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
      const navDown = e.key === "j" || e.key === "ArrowDown";
      const navUp = e.key === "k" || e.key === "ArrowUp";
      // Nothing to navigate / mark — let / still focus the filter input.
      // Without this guard, j on an empty filtered list would set
      // focusedIndex to -1 (Math.min(-1, 0+1) = -1) and burn the
      // "first visible card" affordance for the next real navigation.
      if ((navDown || navUp || e.key === "r") && list.length === 0) return;
      if (navDown || navUp) {
        e.preventDefault();
        // First j/k press while the user has scrolled past the first card:
        // anchor focus to the card currently nearest the top of the
        // viewport rather than jumping back to card 0.
        const wasUsed = keyboardNavUsedRef.current;
        setKeyboardNavUsed(true);
        if (!wasUsed) {
          const firstVisible = firstVisibleChangeIndex(list);
          if (firstVisible !== -1) {
            setFocusedIndex(firstVisible);
            return;
          }
        }
        if (navDown) {
          setFocusedIndex((i) => Math.min(list.length - 1, i + 1));
        } else {
          setFocusedIndex((i) => Math.max(0, i - 1));
        }
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

  // When a new filter narrows the list past the current focused index,
  // clamp the focus back into range so the next j/k starts from a
  // visible row rather than nothing.
  useEffect(() => {
    if (focusedIndex >= filtered.length && filtered.length > 0) {
      setFocusedIndex(filtered.length - 1);
    }
  }, [filtered.length, focusedIndex]);

  useEffect(() => {
    const c = filtered[focusedIndex];
    if (!c) return;
    const el = document.querySelector<HTMLElement>(`[data-change-id="${c.id}"]`);
    // Respect prefers-reduced-motion explicitly — browsers usually do
    // this for scrollIntoView already, but not all versions.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
  }, [focusedIndex, filtered]);

  const reviewedCount = filtered.filter((c) => reviewed.has(c.id)).length;
  const [tipSeen, setTipSeen] = useState<boolean | null>(null);
  useEffect(() => {
    kv.get<boolean>(TIP_SEEN_KEY)
      .then((v) => setTipSeen(!!v))
      .catch(() => setTipSeen(true)); // on read error, suppress the tip
  }, []);
  const dismissTip = (): void => {
    kv.set(TIP_SEEN_KEY, true).catch(() => {});
    setTipSeen(true);
  };
  const hasActiveFilter = filter !== "ALL" || sectionFilter !== "ALL" || textFilter.trim().length > 0;
  const clearFilters = (): void => {
    setFilter("ALL");
    setSectionFilter("ALL");
    setTextFilter("");
  };

  // Stable identity so React.memo(ChangeCard) actually skips re-renders
  // when only an unrelated card's reviewed state changes.
  const toggleReviewed = useCallback((id: string): void => {
    setReviewed((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
      {sessionNotices && sessionNotices.length > 0 && (
        <div className="warning-banner" role="status" aria-live="polite">
          <div className="warning-banner__title">This session</div>
          <ul className="reset-list" style={{ paddingLeft: 18, margin: 0 }}>
            {sessionNotices.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      <Summary result={result} />
      <div className="filter-bar" role="search" aria-label="Filter changes">
      <div className="filters" role="group" aria-label="Severity filter">
        <button
          className={`filter-chip ${filter === "ALL" ? "filter-chip--active" : ""}`}
          onClick={() => setFilter("ALL")}
          aria-pressed={filter === "ALL"}
        >
          All ({result.changes.length})
        </button>
        <button
          className={`filter-chip ${filter === "CRITICAL" ? "filter-chip--active" : ""}`}
          onClick={() => setFilter("CRITICAL")}
          disabled={result.criticalCount === 0}
          aria-pressed={filter === "CRITICAL"}
          title={
            result.criticalCount === 0
              ? "No critical changes in this diff"
              : `Show only the ${result.criticalCount} critical change${result.criticalCount === 1 ? "" : "s"}`
          }
        >
          Critical ({result.criticalCount})
        </button>
        {reviewedCount > 0 && (
          <span className="section-chip-counts" aria-live="polite">
            {reviewedCount}/{filtered.length} reviewed
          </span>
        )}
        {hasActiveFilter && (
          <button
            className="ghost"
            onClick={clearFilters}
            style={{ fontSize: 11, marginLeft: "auto" }}
            title="Clear all filters"
          >
            Clear filters
          </button>
        )}
      </div>
      {availableSections.length > 1 && (
        <div className="filters" role="group" aria-label="Section filter">
          <button
            className={`filter-chip ${sectionFilter === "ALL" ? "filter-chip--active" : ""}`}
            onClick={() => setSectionFilter("ALL")}
            aria-pressed={sectionFilter === "ALL"}
          >
            All sections
          </button>
          {availableSections.map(([s, n]) => (
            <button
              key={s}
              className={`filter-chip ${sectionFilter === s ? "filter-chip--active" : ""}`}
              onClick={() => setSectionFilter(s)}
              aria-pressed={sectionFilter === s}
            >
              {s === "?" ? "Other" : `Section ${s}`} ({n})
            </button>
          ))}
        </div>
      )}
      <div style={{ marginBottom: 12 }}>
        <input
          ref={filterInputRef}
          type="search"
          placeholder="Filter by text… (press / to focus)"
          aria-label="Filter changes by text"
          autoComplete="off"
          spellCheck={false}
          value={textFilter}
          onChange={(e) => setTextFilter(e.target.value)}
        />
      </div>
      {/* Always-available, keyboard-accessible shortcut reference (a native
          <details> — no modal / focus-trap needed). Complements the
          one-time tip below, which is dismissed forever after first view. */}
      <details className="shortcuts">
        <summary>Keyboard shortcuts</summary>
        <ul className="reset-list shortcuts__list">
          <li><kbd>J</kbd> / <kbd>K</kbd> — next / previous change</li>
          <li><kbd>R</kbd> — mark the focused change reviewed</li>
          <li><kbd>/</kbd> — jump to the text filter</li>
          {filter === "CRITICAL" && (
            <li style={{ fontStyle: "italic", opacity: 0.8, marginTop: 4 }}>
              J / K navigate Critical changes only — switch to All to reach every change.
            </li>
          )}
        </ul>
      </details>
      </div>
      {filtered.length === 0 ? (
        <div className="empty">
          <p style={{ marginTop: 0 }}>
            {result.changes.length === 0
              ? result.warnings.length > 0
                ? "No textual differences detected — but the warnings above mean extraction may not have read all of the content."
                : "No changes detected. These two versions appear to be identical."
              : filter === "CRITICAL"
                ? "No critical changes match the current filters. Switch to 'All' or a different section to see every change."
                : "No changes match the current filter."}
          </p>
          {hasActiveFilter && (
            <button onClick={clearFilters}>Clear filters</button>
          )}
        </div>
      ) : (
        filtered.map((c, i) => (
          <div
            key={c.id}
            data-change-id={c.id}
            className={
              keyboardNavUsed && i === focusedIndex
                ? "change-row change-row--focused"
                : "change-row"
            }
          >
            <ChangeCard
              change={c}
              reviewed={reviewed.has(c.id)}
              onToggleReviewed={toggleReviewed}
            />
          </div>
        ))
      )}
      {tipSeen === false && (
        <div className="tip">
          <span>Keyboard: J/K (next/previous) · R (mark reviewed) · / (search)</span>
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

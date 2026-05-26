import React, { useCallback, useEffect, useState } from "react";
import type { DiffSummary } from "../core/interfaces.js";
import type { DiffStorage } from "../core/storage/index.js";

interface Props {
  storage: DiffStorage;
  onOpen: (id: string) => void;
}

function relativeTime(iso: string): string {
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return "";
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(d).toLocaleDateString();
}

export function History({ storage, onOpen }: Props): React.ReactElement | null {
  const [items, setItems] = useState<DiffSummary[]>([]);

  const refresh = useCallback((): void => {
    storage.listDiffs().then(setItems).catch(() => setItems([]));
  }, [storage]);

  useEffect(refresh, [refresh]);

  const onDelete = async (id: string): Promise<void> => {
    await storage.deleteDiff(id);
    refresh();
  };

  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="section-heading">Recent diffs</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.slice(0, 12).map((s) => {
          const unseen = !s.lastViewedAt;
          return (
            <li
              key={s.id}
              className="history-item"
              tabIndex={0}
              role="button"
              onClick={() => onOpen(s.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen(s.id);
                } else if (e.key === "Delete" || e.key === "Backspace") {
                  void onDelete(s.id);
                }
              }}
              aria-label={`Open diff: ${s.solicitationId ?? s.currentFileName}`}
            >
              <div className="history-item__main">
                <div className="history-item__title">
                  {unseen && <span className="history-item__unseen" aria-label="New" title="Not yet opened" />}
                  {s.solicitationId ?? s.currentFileName}
                </div>
                <div className="history-item__meta">
                  {s.totalChanges} changes
                  {s.criticalCount > 0 ? ` · ${s.criticalCount} critical` : ""}
                  {" · "}
                  {relativeTime(s.generatedAt)}
                </div>
              </div>
              <button
                className="ghost"
                aria-label="Delete this diff from history"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  void onDelete(s.id);
                }}
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

import React, { useEffect, useState } from "react";
import type { DiffSummary } from "../core/interfaces.js";
import type { DiffStorage } from "../core/storage/index.js";

interface Props {
  storage: DiffStorage;
  onOpen: (id: string) => void;
}

export function History({ storage, onOpen }: Props): React.ReactElement | null {
  const [items, setItems] = useState<DiffSummary[]>([]);

  useEffect(() => {
    storage
      .listDiffs()
      .then(setItems)
      .catch(() => setItems([]));
  }, [storage]);

  if (items.length === 0) return null;

  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 13, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Recent diffs
      </h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.slice(0, 8).map((s) => (
          <li
            key={s.id}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              marginBottom: 6,
              background: "var(--bg-elev)",
              cursor: "pointer",
            }}
            onClick={() => onOpen(s.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onOpen(s.id);
            }}
            role="button"
            tabIndex={0}
          >
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              {s.solicitationId ?? s.currentFileName}
            </div>
            <div style={{ color: "var(--fg-muted)", fontSize: 12 }}>
              {s.totalChanges} changes
              {s.criticalCount > 0 ? ` · ${s.criticalCount} critical` : ""}
              {" · "}
              {new Date(s.generatedAt).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

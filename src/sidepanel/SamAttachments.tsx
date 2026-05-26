/**
 * Side-panel widget showing attachments the content script discovered on
 * the current SAM.gov page. Clicking one downloads + extracts it as the
 * current or prior version.
 */
import React, { useEffect, useState } from "react";
import type { OpportunityAttachment } from "../core/interfaces.js";

interface Props {
  onChooseCurrent: (attachment: OpportunityAttachment) => void;
  onChoosePrior: (attachment: OpportunityAttachment) => void;
}

async function fetchLastAttachments(): Promise<OpportunityAttachment[]> {
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (globalThis as any).chrome;
    if (!api?.runtime?.sendMessage) {
      resolve([]);
      return;
    }
    try {
      api.runtime.sendMessage({ type: "GET_LAST_ATTACHMENTS" }, (resp: { attachments?: OpportunityAttachment[] } | undefined) => {
        resolve(resp?.attachments ?? []);
      });
    } catch {
      resolve([]);
    }
  });
}

export function SamAttachments({ onChooseCurrent, onChoosePrior }: Props): React.ReactElement | null {
  const [items, setItems] = useState<OpportunityAttachment[] | null>(null);

  useEffect(() => {
    fetchLastAttachments().then((a) => setItems(a));
  }, []);

  if (items === null) return null;
  if (items.length === 0) return null;

  return (
    <section style={{ marginTop: 24 }}>
      <h2
        style={{
          fontSize: 13,
          color: "var(--fg-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Attachments on this SAM.gov page
      </h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((a) => (
          <li
            key={a.id}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              marginBottom: 6,
              background: "var(--bg-elev)",
              display: "flex",
              gap: 8,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.fileName}
              </div>
              {a.mimeType && (
                <div style={{ color: "var(--fg-muted)", fontSize: 11 }}>{a.mimeType}</div>
              )}
            </div>
            <button
              onClick={() => onChooseCurrent(a)}
              title="Use as new (amendment) version"
              style={{ fontSize: 11 }}
            >
              As new
            </button>
            <button
              onClick={() => onChoosePrior(a)}
              title="Use as prior version"
              style={{ fontSize: 11 }}
            >
              As prior
            </button>
          </li>
        ))}
      </ul>
      <p style={{ color: "var(--fg-muted)", fontSize: 11, marginTop: 8 }}>
        Click 'As new' or 'As prior' to download and use this attachment.
      </p>
    </section>
  );
}

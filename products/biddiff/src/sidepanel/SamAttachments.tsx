/**
 * Side-panel widget showing attachments the content script discovered on
 * the current SAM.gov page. Clicking one downloads + extracts it as the
 * current or prior version.
 */
import React, { useEffect, useState } from "react";
import type { OpportunityAttachment } from "../core/interfaces.js";
import type { LastAttachmentsResponse } from "../shared/messages.js";

interface Props {
  onChooseCurrent: (attachment: OpportunityAttachment) => void;
  onChoosePrior: (attachment: OpportunityAttachment) => void;
  /** Set of "slot:attachmentId" keys currently downloading. */
  downloading?: ReadonlySet<string>;
}

async function fetchLastAttachments(): Promise<OpportunityAttachment[]> {
  const { sendRuntime } = await import("../shared/chrome-rt.js");
  const resp = await sendRuntime<LastAttachmentsResponse>({
    kind: "biddiff/get-last-attachments",
  });
  return resp?.attachments ?? [];
}

export function SamAttachments({
  onChooseCurrent,
  onChoosePrior,
  downloading,
}: Props): React.ReactElement | null {
  const [items, setItems] = useState<OpportunityAttachment[] | null>(null);

  useEffect(() => {
    // .catch so an unreachable background SW doesn't surface as an
    // unhandled promise rejection. Treat any failure as "no attachments".
    const refresh = (): void => {
      fetchLastAttachments()
        .then((a) => setItems(a))
        .catch(() => setItems([]));
    };
    refresh();

    // The BG service worker writes biddiff.lastAttachments whenever the
    // user clicks "Compare with BidDiff" on a SAM page. Refresh the
    // list when that happens so users who open a second SAM tab don't
    // see stale attachments from the first.
    if (typeof chrome === "undefined" || !chrome.storage?.onChanged?.addListener) {
      return;
    }
    const listener = (
      changes: { [key: string]: unknown },
      area: string,
    ): void => {
      if (area !== "session" && area !== "local") return;
      if ("biddiff.lastAttachments" in changes) refresh();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  if (items === null) return null;
  if (items.length === 0) return null;

  return (
    <section className="sam-attachments">
      <h2 className="section-heading">Attachments on this SAM.gov page</h2>
      <ul className="reset-list">
        {items.map((a) => (
          <li key={a.id} className="sam-attachments__row">
            <div className="sam-attachments__main">
              <div className="sam-attachments__name" title={a.fileName}>
                {a.fileName}
              </div>
              {a.mimeType && <div className="sam-attachments__mime">{a.mimeType}</div>}
            </div>
            <button
              onClick={() => onChooseCurrent(a)}
              title="Use as new (amendment) version"
              className="sam-attachments__btn"
              disabled={downloading?.has(`current:${a.id}`) ?? false}
            >
              {downloading?.has(`current:${a.id}`) ? "Loading…" : "As new"}
            </button>
            <button
              onClick={() => onChoosePrior(a)}
              title="Use as prior version"
              className="sam-attachments__btn"
              disabled={downloading?.has(`prior:${a.id}`) ?? false}
            >
              {downloading?.has(`prior:${a.id}`) ? "Loading…" : "As prior"}
            </button>
          </li>
        ))}
      </ul>
      <p className="sam-attachments__hint">
        Click &lsquo;As new&rsquo; or &lsquo;As prior&rsquo; to download and use this attachment.
      </p>
    </section>
  );
}

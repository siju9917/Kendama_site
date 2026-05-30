import React, { useRef, useState } from "react";
import { FilePicker } from "./FilePicker.js";
import { SamAttachments } from "./SamAttachments.js";
import type { OpportunityAttachment } from "../core/interfaces.js";

/**
 * Only ever fetch attachment URLs over https. The URL comes from a
 * sam.gov page's anchor href (the content script is host-scoped to
 * sam.gov), so in practice it is already https — but fetching from the
 * extension's privileged context means a `file:` / `data:` / `blob:`
 * href (a malformed link or a sam.gov XSS) must not be followed.
 * Scheme allowlist per the Security Critic checklist + QUALITY_BAR
 * "HTTPS-only". Exported for unit testing.
 */
export function isAllowedDownloadUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

async function downloadAttachmentAsFile(a: OpportunityAttachment): Promise<File> {
  if (!isAllowedDownloadUrl(a.url)) {
    throw new Error("This attachment link isn't a secure (https) URL.");
  }
  // 5-minute timeout so a slow / hung server doesn't lock the button
  // indefinitely. The user can retry.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);
  try {
    const resp = await fetch(a.url, { signal: controller.signal });
    if (!resp.ok) throw new Error(`download failed (${resp.status})`);
    const blob = await resp.blob();
    return new File([blob], a.fileName, {
      type: blob.type || a.mimeType || "application/octet-stream",
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function FilePickerWithSam({
  onRun,
}: {
  onRun: (current: File, prior: File) => void;
}): React.ReactElement {
  const [, setPending] = useState<{ current?: File; prior?: File }>({});
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  // Synchronous mirror so a double-click can't trigger two downloads
  // before React updates the disabled prop on the button.
  const downloadingRef = useRef<Set<string>>(new Set());
  const onChoose = async (
    slot: "current" | "prior",
    a: OpportunityAttachment,
  ): Promise<void> => {
    const dlKey = `${slot}:${a.id}`;
    if (downloadingRef.current.has(dlKey)) return;
    downloadingRef.current.add(dlKey);
    setError(null);
    setDownloading((s) => new Set(s).add(dlKey));
    try {
      const file = await downloadAttachmentAsFile(a);
      // Functional setState so two concurrent downloads merging in
      // either order don't overwrite each other (the captured
      // `pending` reference would be stale).
      let curRef: File | undefined;
      let priRef: File | undefined;
      setPending((prev) => {
        const next = { ...prev, [slot]: file };
        curRef = next.current;
        priRef = next.prior;
        return next;
      });
      // Fire onRun outside the updater so strict-mode double-invocation
      // doesn't call it twice.
      if (curRef && priRef) onRun(curRef, priRef);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      downloadingRef.current.delete(dlKey);
      setDownloading((s) => {
        const next = new Set(s);
        next.delete(dlKey);
        return next;
      });
    }
  };
  return (
    <>
      <FilePicker onRun={onRun} />
      {error && (
        <div className="error" role="alert">
          Couldn&apos;t download: {error}
        </div>
      )}
      <SamAttachments
        onChooseCurrent={(a) => onChoose("current", a)}
        onChoosePrior={(a) => onChoose("prior", a)}
        downloading={downloading}
      />
    </>
  );
}

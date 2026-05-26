import React, { useRef, useState } from "react";
import { FilePicker } from "./FilePicker.js";
import { SamAttachments } from "./SamAttachments.js";
import type { OpportunityAttachment } from "../core/interfaces.js";

async function downloadAttachmentAsFile(a: OpportunityAttachment): Promise<File> {
  const resp = await fetch(a.url);
  if (!resp.ok) throw new Error(`download failed (${resp.status})`);
  const blob = await resp.blob();
  return new File([blob], a.fileName, {
    type: blob.type || a.mimeType || "application/octet-stream",
  });
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

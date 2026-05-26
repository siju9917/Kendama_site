import React, { useState } from "react";
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
          Couldn&apos;t download: {error}
        </div>
      )}
      <SamAttachments
        onChooseCurrent={(a) => onChoose("current", a)}
        onChoosePrior={(a) => onChoose("prior", a)}
      />
    </>
  );
}

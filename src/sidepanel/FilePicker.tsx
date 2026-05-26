import React, { useCallback, useState } from "react";

interface Props {
  onRun: (current: File, prior: File) => void;
}

const ACCEPTED = [".pdf", ".docx"];

function isAccepted(file: File): boolean {
  const lower = file.name.toLowerCase();
  return ACCEPTED.some((ext) => lower.endsWith(ext));
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function Dropzone({
  slot,
  file,
  onPick,
  active,
  setActive,
}: {
  slot: "current" | "prior";
  file: File | null;
  onPick: (f: File | null) => void;
  active: boolean;
  setActive: (a: boolean) => void;
}): React.ReactElement {
  const label = slot === "current" ? "New version (the amendment)" : "Prior version";
  const hint = file ? null : "Drop a PDF or .docx, or click to choose";
  const onChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0] ?? null;
    if (f && !isAccepted(f)) {
      onPick(null);
      return;
    }
    onPick(f);
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setActive(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!isAccepted(f)) {
      onPick(null);
      return;
    }
    onPick(f);
  };
  return (
    <div
      className={`dropzone ${active ? "dropzone--active" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={onDrop}
      aria-label={`${label} drop zone`}
    >
      <div className="dropzone__icon" aria-hidden="true" />
      <div className="dropzone__label">{label}</div>
      {file ? (
        <>
          <div className="dropzone__filename">{file.name}</div>
          <div className="dropzone__hint">{formatBytes(file.size)}</div>
        </>
      ) : (
        <div className="dropzone__hint">{hint}</div>
      )}
      <input
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={onChange}
        aria-label={`Choose ${label}`}
      />
    </div>
  );
}

export function FilePicker({ onRun }: Props): React.ReactElement {
  const [current, setCurrent] = useState<File | null>(null);
  const [prior, setPrior] = useState<File | null>(null);
  const [activeSlot, setActiveSlot] = useState<null | "current" | "prior">(null);
  const [rejectMsg, setRejectMsg] = useState<string | null>(null);

  const setCurrentSafe = useCallback((f: File | null) => {
    if (!f) {
      setRejectMsg("Only PDF (.pdf) and Word (.docx) files are supported.");
      return;
    }
    setRejectMsg(null);
    setCurrent(f);
  }, []);
  const setPriorSafe = useCallback((f: File | null) => {
    if (!f) {
      setRejectMsg("Only PDF (.pdf) and Word (.docx) files are supported.");
      return;
    }
    setRejectMsg(null);
    setPrior(f);
  }, []);

  const canRun = current !== null && prior !== null;

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === "Enter" && canRun) onRun(current!, prior!);
  };

  return (
    <div onKeyDown={onKeyDown}>
      <Dropzone
        slot="current"
        file={current}
        onPick={setCurrentSafe}
        active={activeSlot === "current"}
        setActive={(a) => setActiveSlot(a ? "current" : null)}
      />
      <Dropzone
        slot="prior"
        file={prior}
        onPick={setPriorSafe}
        active={activeSlot === "prior"}
        setActive={(a) => setActiveSlot(a ? "prior" : null)}
      />

      {rejectMsg && (
        <div className="error" role="alert">
          {rejectMsg}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <button
          className="primary"
          disabled={!canRun}
          onClick={() => canRun && onRun(current!, prior!)}
          title={canRun ? "Press Enter to compare" : "Pick both versions first"}
        >
          Compare versions
        </button>
      </div>
    </div>
  );
}

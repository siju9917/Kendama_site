import React, { useCallback, useState } from "react";

interface Props {
  onRun: (current: File, prior: File) => void;
}

export function FilePicker({ onRun }: Props): React.ReactElement {
  const [current, setCurrent] = useState<File | null>(null);
  const [prior, setPrior] = useState<File | null>(null);
  const [dragging, setDragging] = useState<null | "current" | "prior">(null);

  const onDrop = useCallback(
    (slot: "current" | "prior") => (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(null);
      const f = e.dataTransfer.files?.[0];
      if (!f) return;
      if (slot === "current") setCurrent(f);
      else setPrior(f);
    },
    [],
  );

  const canRun = current && prior;

  return (
    <div>
      <div className="empty">
        <p>
          <strong>Drop the new and prior versions of the solicitation</strong>
        </p>
        <p style={{ marginTop: 0, color: "var(--fg-muted)" }}>
          PDF or Word (.docx). Files stay on this device.
        </p>
      </div>

      <div
        className={`dropzone ${dragging === "current" ? "dropzone--active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging("current");
        }}
        onDragLeave={() => setDragging(null)}
        onDrop={onDrop("current")}
      >
        <div style={{ fontWeight: 600 }}>New version (the amendment)</div>
        <div style={{ color: "var(--fg-muted)", marginTop: 4 }}>
          {current ? current.name : "Drop file or click to choose"}
        </div>
        <input
          type="file"
          accept=".pdf,.docx"
          style={{ marginTop: 8 }}
          onChange={(e) => setCurrent(e.target.files?.[0] ?? null)}
        />
      </div>

      <div
        className={`dropzone ${dragging === "prior" ? "dropzone--active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging("prior");
        }}
        onDragLeave={() => setDragging(null)}
        onDrop={onDrop("prior")}
      >
        <div style={{ fontWeight: 600 }}>Prior version</div>
        <div style={{ color: "var(--fg-muted)", marginTop: 4 }}>
          {prior ? prior.name : "Drop file or click to choose"}
        </div>
        <input
          type="file"
          accept=".pdf,.docx"
          style={{ marginTop: 8 }}
          onChange={(e) => setPrior(e.target.files?.[0] ?? null)}
        />
      </div>

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <button
          className="primary"
          disabled={!canRun}
          onClick={() => canRun && onRun(current!, prior!)}
        >
          Compare versions
        </button>
      </div>
    </div>
  );
}

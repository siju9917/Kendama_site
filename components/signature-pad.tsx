"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  name: string;
  initialDataUrl?: string | null;
};

/**
 * Hand-drawn signature pad. Emits the captured PNG data URL as a hidden input
 * so it rides along in a normal <form> submission.
 */
export function SignaturePad({ name, initialDataUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>(initialDataUrl ?? "");
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.clientWidth * dpr;
    c.height = c.clientHeight * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.clientWidth, c.clientHeight);
    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, c.clientWidth, c.clientHeight);
      img.src = initialDataUrl;
    }
  }, [initialDataUrl]);

  function pos(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function down(e: React.PointerEvent) {
    drawingRef.current = true;
    lastRef.current = pos(e);
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!drawingRef.current) return;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const p = pos(e);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (lastRef.current) ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
  }
  function up() {
    drawingRef.current = false;
    lastRef.current = null;
    const c = canvasRef.current!;
    setDataUrl(c.toDataURL("image/png"));
  }
  function clear() {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.clientWidth, c.clientHeight);
    setDataUrl("");
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="w-full h-40 border border-gray-300 rounded bg-white touch-none"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        aria-label="Signature pad — sign with mouse, touch, or stylus"
      />
      <div className="flex items-center justify-between">
        <button type="button" className="btn-ghost text-sm" onClick={clear}>Clear</button>
        <span className="text-xs text-gray-500">{dataUrl ? "Signature captured" : "Sign above"}</span>
      </div>
      <input type="hidden" name={name} value={dataUrl} />
    </div>
  );
}

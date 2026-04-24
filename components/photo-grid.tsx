"use client";
import { useCallback, useEffect, useState } from "react";

export type PhotoItem = {
  id: string;
  caption: string | null;
  tag: string | null;
};

type Props = {
  jobId: string;
  photos: PhotoItem[];
  /** Renders the delete form for a given photo inside a positioned overlay. */
  renderDeleteForm: (photoId: string) => React.ReactNode;
};

/**
 * Thumbnail grid with a keyboard-navigable lightbox (Esc, arrow keys).
 * Kept presentational — the delete action is a server form passed in by the
 * parent page so we don't duplicate tenancy checks in a client component.
 */
export function PhotoGrid({ photos, renderDeleteForm }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const close = useCallback(() => setOpenIdx(null), []);
  const prev = useCallback(() => setOpenIdx((i) => (i == null || i === 0 ? i : i - 1)), []);
  const next = useCallback(() => setOpenIdx((i) => (i == null || i >= photos.length - 1 ? i : i + 1)), [photos.length]);

  useEffect(() => {
    if (openIdx == null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIdx, close, prev, next]);

  const active = openIdx != null ? photos[openIdx] : null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {photos.map((p, i) => (
          <div key={p.id} className="relative group aspect-square overflow-hidden rounded bg-gray-100">
            <button
              type="button"
              onClick={() => setOpenIdx(i)}
              className="block h-full w-full focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
              aria-label={`View photo ${i + 1}${p.caption ? `: ${p.caption}` : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photos/${p.id}`}
                alt={p.caption ?? p.tag ?? ""}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
              {renderDeleteForm(p.id)}
            </div>
            {p.caption && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-1 py-0.5 truncate">
                {p.caption}
              </div>
            )}
          </div>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={close}
        >
          <div className="relative max-h-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photos/${active.id}`}
              alt={active.caption ?? ""}
              className="max-h-[80vh] max-w-full object-contain rounded shadow-lg"
            />
            <div className="mt-3 flex items-center justify-between text-sm text-white">
              <div>
                <div className="font-medium">{active.caption ?? active.tag ?? "Photo"}</div>
                <div className="text-xs text-gray-300">
                  {openIdx != null && <>Photo {openIdx + 1} of {photos.length}</>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={prev} disabled={openIdx === 0} className="btn-secondary" aria-label="Previous photo">← Prev</button>
                <button onClick={next} disabled={openIdx === photos.length - 1} className="btn-secondary" aria-label="Next photo">Next →</button>
                <button onClick={close} className="btn-secondary" aria-label="Close viewer">Close (Esc)</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

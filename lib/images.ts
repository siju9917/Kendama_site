// Server-side image validation without pulling in sharp/file-type.
// Sniffs the leading magic bytes of the buffer and only accepts JPEG, PNG, WebP.
// HEIC is rejected with a clear error — we'd want sharp/heif-converter to accept it.

export const MAX_PHOTO_BYTES = 12 * 1024 * 1024; // 12 MB per file
export const MAX_PHOTOS_PER_REQUEST = 30;

export type SniffedKind = "jpeg" | "png" | "webp";

export function sniffImage(buf: Buffer): { kind: SniffedKind; mime: string; ext: string } | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { kind: "jpeg", mime: "image/jpeg", ext: "jpg" };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return { kind: "png", mime: "image/png", ext: "png" };
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return { kind: "webp", mime: "image/webp", ext: "webp" };
  }
  return null;
}

export type ValidatedPhoto = {
  buf: Buffer;
  mime: string;
  ext: string;
};

/** Returns null when the input is not a valid, allowed image. */
export function validatePhoto(buf: Buffer): ValidatedPhoto | null {
  if (buf.length === 0 || buf.length > MAX_PHOTO_BYTES) return null;
  const sniff = sniffImage(buf);
  if (!sniff) return null;
  return { buf, mime: sniff.mime, ext: sniff.ext };
}

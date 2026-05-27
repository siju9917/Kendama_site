/**
 * Generate placeholder square icons in pure Node — no native deps.
 *
 * Produces PNG files with a simple gradient + monogram-friendly background.
 * Real branded icons will replace these before Web Store submission.
 */
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "icons");
mkdirSync(OUT_DIR, { recursive: true });

const ACCENT = { r: 0x1f, g: 0x5c, b: 0xd6 };
const FG = { r: 0xff, g: 0xff, b: 0xff };

const PNG_SIG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function crc32(buf) {
  const sig = createHash("sha1"); // placeholder — replaced by table below
  void sig;
  let table = crc32.table;
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    crc32.table = table;
  }
  let c = 0xffffffff;
  for (const b of buf) c = (table[(c ^ b) & 0xff] ^ (c >>> 8)) >>> 0;
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = data.length;
  const buf = new Uint8Array(8 + length + 4);
  const dv = new DataView(buf.buffer);
  dv.setUint32(0, length);
  buf.set(type, 4);
  buf.set(data, 8);
  const crcBuf = new Uint8Array(4 + length);
  crcBuf.set(type, 0);
  crcBuf.set(data, 4);
  dv.setUint32(8 + length, crc32(crcBuf));
  return buf;
}

function buildPng(size) {
  // Build raw RGBA scanlines with a simple geometric mark on the accent bg.
  // Layout: solid accent background, white square in the center.
  const px = (x, y) => {
    const margin = Math.max(1, Math.floor(size * 0.18));
    const inner = size - margin * 2;
    const innerX = x - margin;
    const innerY = y - margin;
    const inside = innerX >= 0 && innerX < inner && innerY >= 0 && innerY < inner;
    // Inside: draw two stacked stripes to suggest "before / after"
    if (inside) {
      const half = Math.floor(inner / 2);
      const gap = Math.max(1, Math.floor(inner * 0.06));
      if (innerY < half - gap || innerY > half + gap) return FG;
    }
    return ACCENT;
  };
  const scanline = (y) => {
    // Filter byte = 0
    const line = new Uint8Array(1 + size * 4);
    line[0] = 0;
    for (let x = 0; x < size; x++) {
      const c = px(x, y);
      const off = 1 + x * 4;
      line[off] = c.r;
      line[off + 1] = c.g;
      line[off + 2] = c.b;
      line[off + 3] = 0xff;
    }
    return line;
  };
  const lines = [];
  for (let y = 0; y < size; y++) lines.push(scanline(y));
  const raw = new Uint8Array(lines.reduce((n, l) => n + l.length, 0));
  let off = 0;
  for (const l of lines) {
    raw.set(l, off);
    off += l.length;
  }
  const compressed = deflateSync(raw);

  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, size);
  dv.setUint32(4, size);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const typeIHDR = new TextEncoder().encode("IHDR");
  const typeIDAT = new TextEncoder().encode("IDAT");
  const typeIEND = new TextEncoder().encode("IEND");

  const parts = [PNG_SIG, chunk(typeIHDR, ihdr), chunk(typeIDAT, compressed), chunk(typeIEND, new Uint8Array(0))];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

for (const size of [16, 32, 48, 128]) {
  const buf = buildPng(size);
  const file = join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(file, buf);
  console.log(`Wrote ${file} (${buf.length} bytes)`);
}

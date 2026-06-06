/**
 * Heading detection (Phase 2.4).
 *
 * A heading-detection input is a list of raw lines with optional font hints.
 * We return classifications with confidence so the section-assembly step
 * can decide whether to start a new section.
 *
 * Detection sources (in priority order):
 *   1. UCF section header pattern   (e.g. "SECTION C — STATEMENT OF WORK")
 *   2. Letter-dot prefix             (e.g. "C. STATEMENT OF WORK")
 *   3. Numbered heading prefix       (e.g. "3.2.1 Personnel")
 *   4. Section L/M item label        (e.g. "L.3 Submission Requirements")
 *   5. Font heuristic                — when font hints are available
 *      (size > modal body; bold)
 */

export interface RawLine {
  text: string;
  /** Optional font size in points; if present we use it for the heuristic. */
  fontSize?: number;
  bold?: boolean;
  /** Page index of the source line, 0-based; carried through for diagnostics. */
  page?: number;
}

export type HeadingKind =
  | { kind: "UCF"; letter: string; level: 1 }
  | { kind: "LETTER_DOT"; letter: string; level: 1 }
  | { kind: "NUMBERED"; numbering: string; level: number }
  | { kind: "SECTION_LM_ITEM"; itemId: string; level: 2 }
  | { kind: "FONT_HEURISTIC"; level: number }
  | { kind: "NONE" };

export interface HeadingClassification {
  line: RawLine;
  kind: HeadingKind;
  /** 0..1 confidence the line is in fact a heading. */
  confidence: number;
}

const UCF_HEADER_RE = /^\s*SECTION\s+([A-M])\b/i;
const LETTER_DOT_RE = /^\s*([A-M])\.\s+\S/;
const NUMBERED_RE = /^\s*(\d+(?:\.\d+)*)\.?\s+\S/;
// Covers A–M letter-dot-number items: "C.3 SOW", "L.4 Submission", "M.1 Factors".
// LETTER_DOT matches "C. Title" (space after dot); this matches "C.3 Title" (digit after dot).
// They are mutually exclusive, so ordering in classifyHeading doesn't matter for correctness,
// but SECTION_LM_RE is checked first to preserve the L/M sub-item precedence (see test).
const SECTION_LM_RE = /^\s*([A-M])\.(\d+(?:\.\d+)*)\s*[—\-:]?\s*\S/;

/** Classify a single line. */
export function classifyHeading(line: RawLine, modalBodyFontSize?: number): HeadingClassification {
  const raw = line.text.trim();
  if (raw.length === 0) {
    return { line, kind: { kind: "NONE" }, confidence: 0 };
  }

  // 1. UCF section header
  let m = raw.match(UCF_HEADER_RE);
  if (m) {
    return { line, kind: { kind: "UCF", letter: m[1].toUpperCase(), level: 1 }, confidence: 0.99 };
  }

  // 4. Section L/M item label (check BEFORE LETTER_DOT to avoid confusion with C.x)
  m = raw.match(SECTION_LM_RE);
  if (m) {
    return {
      line,
      kind: { kind: "SECTION_LM_ITEM", itemId: `${m[1].toUpperCase()}.${m[2]}`, level: 2 },
      confidence: 0.92,
    };
  }

  // 2. Letter-dot prefix — A., B., ... M.
  m = raw.match(LETTER_DOT_RE);
  if (m) {
    return { line, kind: { kind: "LETTER_DOT", letter: m[1].toUpperCase(), level: 1 }, confidence: 0.85 };
  }

  // 3. Numbered prefix
  m = raw.match(NUMBERED_RE);
  if (m) {
    const depth = m[1].split(".").length;
    return { line, kind: { kind: "NUMBERED", numbering: m[1], level: depth + 1 }, confidence: 0.7 };
  }

  // 5. Font heuristic — needs hints
  if (line.fontSize !== undefined && modalBodyFontSize !== undefined && modalBodyFontSize > 0) {
    const big = line.fontSize >= modalBodyFontSize * 1.15;
    const bold = line.bold === true;
    if ((big || bold) && raw.length <= 120) {
      // Approximate level: bigger font => smaller (more important) level number.
      const ratio = line.fontSize / modalBodyFontSize;
      const level = ratio >= 1.5 ? 1 : ratio >= 1.3 ? 2 : 3;
      const conf = (big ? 0.5 : 0) + (bold ? 0.3 : 0);
      return { line, kind: { kind: "FONT_HEURISTIC", level }, confidence: conf };
    }
  }

  return { line, kind: { kind: "NONE" }, confidence: 0 };
}

/** Classify every line. */
export function classifyLines(
  lines: ReadonlyArray<RawLine>,
  modalBodyFontSize?: number,
): HeadingClassification[] {
  return lines.map((l) => classifyHeading(l, modalBodyFontSize));
}

/** Compute the modal (most frequent) font size from a body of lines. */
export function computeModalFontSize(lines: ReadonlyArray<RawLine>): number | undefined {
  const counts = new Map<number, number>();
  for (const l of lines) {
    if (l.fontSize === undefined) continue;
    const k = Math.round(l.fontSize * 10) / 10;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  if (counts.size === 0) return undefined;
  let best = 0;
  let bestN = -1;
  for (const [size, n] of counts) {
    if (n > bestN) {
      bestN = n;
      best = size;
    }
  }
  return best;
}

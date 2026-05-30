/**
 * Anchor detectors (Phase 2.8).
 *
 * Each detector is a pure function: string -> Anchor[].
 * Detectors are composed by `detectAllAnchors` which returns all anchors in
 * deterministic order (by charStart, then type).
 *
 * Detection is deliberately conservative:
 *   - CLAUSE_REF only matches the canonical XX.XXX-XXXX(s) pattern.
 *   - CLIN is only emitted in PRICING-context calls (the caller decides).
 *   - DATE handles three explicit formats + deadline phrases.
 */
import type { Anchor } from "../../model/types.js";
import { normalizeText } from "../../../shared/text.js";

export interface DetectorContext {
  /** When true, allow CLIN matching (Section B only). */
  allowClin?: boolean;
}

// ---------- Clause references (FAR / DFARS / GSAR / NASA-FAR) ----------

// 2-4 digits . 3 digits - 1-4 digits.
//   FAR  52.204-21
//   DFARS 252.204-7012
//   GSAR 552.215-72
//   NASA NFS 1852.227-70
const CLAUSE_RE =
  /(?:\b(?:FAR|DFARS|GSAR|NFS|VAAR)\s+)?\b(\d{2,4}\.\d{3}-\d{1,4})\b/gi;

export function detectClauseRefs(text: string): Anchor[] {
  const out: Anchor[] = [];
  CLAUSE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CLAUSE_RE.exec(text)) !== null) {
    out.push({
      type: "CLAUSE_REF",
      raw: m[0],
      normalized: m[1],
      charStart: m.index,
      charEnd: m.index + m[0].length,
    });
  }
  return out;
}

// ---------- Dates ----------
// We use individual capturing groups via separate passes so each pattern
// stays readable. Dates are normalized to ISO-8601 (YYYY-MM-DD).

const MONTH_NAMES: Readonly<Record<string, number>> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const ISO_DATE_RE = /\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g;
const US_DATE_RE = /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(20\d{2})\b/g;
const MONTH_DAY_YEAR_RE = new RegExp(
  String.raw`\b(${Object.keys(MONTH_NAMES).join("|")})\s+(\d{1,2})(?:,)?\s+(20\d{2})\b`,
  "gi",
);
const DAY_MONTH_YEAR_RE = new RegExp(
  String.raw`\b(\d{1,2})\s+(${Object.keys(MONTH_NAMES).join("|")})\s+(20\d{2})\b`,
  "gi",
);

// "15th day of August, 2026" / "the 1st day of January, 2027" — legal-style.
const DAY_ORDINAL_MONTH_YEAR_RE = new RegExp(
  String.raw`\b(\d{1,2})(?:st|nd|rd|th)\s+day\s+of\s+(${Object.keys(MONTH_NAMES).join("|")})(?:,)?\s+(20\d{2})\b`,
  "gi",
);

function isoDate(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Calendar validity, not just regex shape. The regexes admit
 * month 02 with day 30 ("02/30/2026") or April 31, which would
 * normalize to an impossible ISO date. A date anchor is only useful
 * if it denotes a real day; an impossible one is a typo or a false
 * match, so we drop it (the block-level diff still surfaces the
 * surrounding textual change). Matches the conservative-detection
 * philosophy documented at the top of this module.
 */
function isValidYmd(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= lengths[month - 1];
}

export function detectDates(text: string): Anchor[] {
  const out: Anchor[] = [];

  // Push a DATE anchor only when the (year, month, day) is a real
  // calendar date.
  const pushIfValid = (
    year: number,
    month: number,
    day: number,
    fields: { raw: string; normalized: string; charStart: number; charEnd: number },
  ): void => {
    if (!isValidYmd(year, month, day)) return;
    out.push({ type: "DATE", ...fields });
  };

  // ISO
  ISO_DATE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ISO_DATE_RE.exec(text)) !== null) {
    pushIfValid(Number(m[1]), Number(m[2]), Number(m[3]), {
      raw: m[0],
      normalized: `${m[1]}-${m[2]}-${m[3]}`,
      charStart: m.index,
      charEnd: m.index + m[0].length,
    });
  }

  // US m/d/y
  US_DATE_RE.lastIndex = 0;
  while ((m = US_DATE_RE.exec(text)) !== null) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    const year = Number(m[3]);
    pushIfValid(year, month, day, {
      raw: m[0],
      normalized: isoDate(year, month, day),
      charStart: m.index,
      charEnd: m.index + m[0].length,
    });
  }

  // Month day, year
  MONTH_DAY_YEAR_RE.lastIndex = 0;
  while ((m = MONTH_DAY_YEAR_RE.exec(text)) !== null) {
    const mn = MONTH_NAMES[m[1].toLowerCase()];
    const day = Number(m[2]);
    const year = Number(m[3]);
    if (mn) {
      pushIfValid(year, mn, day, {
        raw: m[0],
        normalized: isoDate(year, mn, day),
        charStart: m.index,
        charEnd: m.index + m[0].length,
      });
    }
  }

  // Day month year
  DAY_MONTH_YEAR_RE.lastIndex = 0;
  while ((m = DAY_MONTH_YEAR_RE.exec(text)) !== null) {
    const mn = MONTH_NAMES[m[2].toLowerCase()];
    const day = Number(m[1]);
    const year = Number(m[3]);
    if (mn) {
      pushIfValid(year, mn, day, {
        raw: m[0],
        normalized: isoDate(year, mn, day),
        charStart: m.index,
        charEnd: m.index + m[0].length,
      });
    }
  }

  // Legal-style: "15th day of August, 2026"
  DAY_ORDINAL_MONTH_YEAR_RE.lastIndex = 0;
  while ((m = DAY_ORDINAL_MONTH_YEAR_RE.exec(text)) !== null) {
    const mn = MONTH_NAMES[m[2].toLowerCase()];
    const day = Number(m[1]);
    const year = Number(m[3]);
    if (mn) {
      pushIfValid(year, mn, day, {
        raw: m[0],
        normalized: isoDate(year, mn, day),
        charStart: m.index,
        charEnd: m.index + m[0].length,
      });
    }
  }

  return dedupSpans(out);
}

// ---------- Money ----------
// Captures a dollar amount, an optional decimal of any length, and an
// optional magnitude suffix (K / M / B / thousand / million / billion).
// Federal solicitations routinely state ceilings as "$1.5M" or
// "$2.3 million"; without the suffix, "$1.5M" would have parsed as the
// value $1 (the old pattern required cents to be exactly two digits and
// ignored the suffix), mis-driving classification and the anchor value.
const MONEY_RE =
  /\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?(?:\s?(K|M|B|thousand|million|billion))?\b/gi;

const MAGNITUDE: Readonly<Record<string, number>> = {
  k: 1e3,
  thousand: 1e3,
  m: 1e6,
  million: 1e6,
  b: 1e9,
  billion: 1e9,
};

export function detectMoney(text: string): Anchor[] {
  MONEY_RE.lastIndex = 0;
  const out: Anchor[] = [];
  let m: RegExpExecArray | null;
  while ((m = MONEY_RE.exec(text)) !== null) {
    const whole = m[1].replace(/,/g, "");
    const frac = m[2] ?? "";
    const mult = m[3] ? (MAGNITUDE[m[3].toLowerCase()] ?? 1) : 1;
    // Normalize to a fixed "dollars.cents" string. The value is only
    // ever compared/displayed, so toFixed(2) rounding is sufficient and
    // keeps magnitudes (e.g. $1.5M → 1500000.00) comparable across
    // amendments regardless of how they were written.
    const value = parseFloat(`${whole}.${frac || "0"}`) * mult;
    out.push({
      type: "MONEY",
      raw: m[0],
      normalized: value.toFixed(2),
      charStart: m.index,
      charEnd: m.index + m[0].length,
    });
  }
  return out;
}

// ---------- Page limit ----------

const PAGE_LIMIT_RE =
  /(?:not\s+(?:to\s+)?exceed|limited\s+to|no\s+more\s+than|maximum\s+of)\s+(\d{1,4})\s+pages\b|page\s+limit[:\s]+(?:of\s+)?(\d{1,4})\s+pages\b/gi;

export function detectPageLimits(text: string): Anchor[] {
  PAGE_LIMIT_RE.lastIndex = 0;
  const out: Anchor[] = [];
  let m: RegExpExecArray | null;
  while ((m = PAGE_LIMIT_RE.exec(text)) !== null) {
    const num = m[1] ?? m[2];
    if (!num) continue;
    out.push({
      type: "PAGE_LIMIT",
      raw: m[0],
      normalized: num,
      charStart: m.index,
      charEnd: m.index + m[0].length,
    });
  }
  return out;
}

// ---------- CLIN ----------
// Conservative — emitted only when the context permits (caller controls).

const CLIN_RE = /\bCLIN\s*0*(\d{1,4})\b/g;

export function detectClins(text: string): Anchor[] {
  CLIN_RE.lastIndex = 0;
  const out: Anchor[] = [];
  let m: RegExpExecArray | null;
  while ((m = CLIN_RE.exec(text)) !== null) {
    out.push({
      type: "CLIN",
      raw: m[0],
      normalized: m[1].padStart(4, "0"),
      charStart: m.index,
      charEnd: m.index + m[0].length,
    });
  }
  return out;
}

// ---------- Section references ----------

const SECTION_REF_RE =
  /\bSection\s+([A-M])(?:\.(\d+(?:\.\d+)*))?\b|\bparagraph\s+([A-M]\.\d+(?:\.\d+)*)\b/gi;

export function detectSectionRefs(text: string): Anchor[] {
  SECTION_REF_RE.lastIndex = 0;
  const out: Anchor[] = [];
  let m: RegExpExecArray | null;
  while ((m = SECTION_REF_RE.exec(text)) !== null) {
    const norm = m[1] ? (m[2] ? `${m[1].toUpperCase()}.${m[2]}` : m[1].toUpperCase()) : m[3].toUpperCase();
    out.push({
      type: "SECTION_REF",
      raw: m[0],
      normalized: norm,
      charStart: m.index,
      charEnd: m.index + m[0].length,
    });
  }
  return out;
}

// ---------- Composition ----------

function dedupSpans(anchors: ReadonlyArray<Anchor>): Anchor[] {
  // If two anchors have the same (type, charStart, charEnd), keep the first.
  const seen = new Set<string>();
  const out: Anchor[] = [];
  for (const a of anchors) {
    const k = `${a.type}|${a.charStart}|${a.charEnd}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  return out;
}

export function sortAnchors(anchors: ReadonlyArray<Anchor>): Anchor[] {
  // Code-point comparison rather than localeCompare so output stays
  // identical across hosts with different default locales.
  return [...anchors].sort(
    (a, b) => a.charStart - b.charStart || (a.type === b.type ? 0 : a.type < b.type ? -1 : 1),
  );
}

export function detectAllAnchors(text: string, ctx: DetectorContext = {}): Anchor[] {
  // Normalize first so anchors survive PDF reformatting (broken clause
  // numbers, ligatures, curly quotes, soft hyphens, line wraps).
  const normalized = normalizeText(text);
  const all: Anchor[] = [
    ...detectClauseRefs(normalized),
    ...detectDates(normalized),
    ...detectMoney(normalized),
    ...detectPageLimits(normalized),
    ...(ctx.allowClin ? detectClins(normalized) : []),
    ...detectSectionRefs(normalized),
  ];
  return sortAnchors(dedupSpans(all));
}

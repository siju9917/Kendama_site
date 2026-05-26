/**
 * Deterministic text normalization and tokenization.
 *
 * Both the extractor and the diff engine MUST use these helpers so that
 * comparison is meaningful and reformatting alone never surfaces as a change.
 */

const NBSP = / /g;
const SOFT_HYPHEN = /­/g;
// Common ligatures Adobe PDFs produce that wreck token matching.
const LIGATURES: ReadonlyArray<[RegExp, string]> = [
  [/ﬀ/g, "ff"],
  [/ﬁ/g, "fi"],
  [/ﬂ/g, "fl"],
  [/ﬃ/g, "ffi"],
  [/ﬄ/g, "ffl"],
  [/‐|‑|‒|–|—/g, "-"],
  [/‘|’/g, "'"],
  [/“|”/g, '"'],
  [/…/g, "..."],
  [/·/g, "*"],
];

/** Collapse whitespace and normalize unicode oddities. Idempotent. */
export function normalizeText(input: string): string {
  let s = input;
  for (const [re, rep] of LIGATURES) {
    s = s.replace(re, rep);
  }
  s = s.replace(NBSP, " ").replace(SOFT_HYPHEN, "");
  // Fix lines broken by a hyphen at EOL: "exam-\nple" -> "example"
  s = s.replace(/([A-Za-z])-\n([a-z])/g, "$1$2");
  // Collapse runs of whitespace to single spaces; trim ends.
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * Word + punctuation tokenizer. Round-trippable up to whitespace
 * normalization: tokens.join(" ") yields the normalized text.
 */
export function tokenize(input: string): string[] {
  const normalized = normalizeText(input);
  if (normalized.length === 0) return [];
  // Match: words (alphanumerics with internal -._/ connectors only — connectors
  // never at word boundaries so trailing punctuation stays separate), or any
  // single non-whitespace non-word character.
  const re = /[A-Za-z0-9]+(?:[._\-/][A-Za-z0-9]+)*|[^\sA-Za-z0-9]/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    out.push(m[0]);
  }
  return out;
}

/** Round-trip joined tokens to a canonical "normalized" form. */
export function joinTokens(tokens: ReadonlyArray<string>): string {
  return tokens.join(" ");
}

/** Token-level Jaccard similarity in [0,1]. */
export function jaccardSimilarity(a: ReadonlyArray<string>, b: ReadonlyArray<string>): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersect = 0;
  for (const t of setA) if (setB.has(t)) intersect++;
  const union = setA.size + setB.size - intersect;
  return union === 0 ? 1 : intersect / union;
}

/** Levenshtein ratio in [0,1], 1 = identical. O(n*m) — short inputs only. */
export function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const m = a.length;
  const n = b.length;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // delete
        curr[j - 1] + 1, // insert
        prev[j - 1] + cost, // substitute
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  const dist = prev[n];
  return 1 - dist / Math.max(m, n);
}

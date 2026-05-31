/**
 * Corpus harness (Phase 1.5).
 *
 * Loads every pair, runs the diff engine, computes metrics against the
 * ground-truth labels. The miss-rate audit (Phase 3.12) uses this to gate
 * promotion of the diff engine.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StructuredDocument } from "../../src/core/model/types.js";
import type { Change, DiffResult, Severity } from "../../src/core/diff/types.js";
import type { CorpusManifest, ExpectedChange, PairLabel } from "./schema.js";
import type { IDiffEngine } from "../../src/core/interfaces.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CORPUS_ROOT = HERE;

export interface PairBundle {
  pairId: string;
  description: string;
  tags: ReadonlyArray<string>;
  prior: StructuredDocument;
  current: StructuredDocument;
  label: PairLabel;
}

export function loadManifest(): CorpusManifest {
  const p = path.join(CORPUS_ROOT, "manifest.json");
  return JSON.parse(fs.readFileSync(p, "utf8")) as CorpusManifest;
}

export function loadPair(pairId: string): PairBundle {
  const manifest = loadManifest();
  const entry = manifest.pairs.find((e) => e.pairId === pairId);
  if (!entry) throw new Error(`No corpus pair: ${pairId}`);

  const prior = JSON.parse(
    fs.readFileSync(path.join(CORPUS_ROOT, entry.priorFile), "utf8"),
  ) as StructuredDocument;
  const current = JSON.parse(
    fs.readFileSync(path.join(CORPUS_ROOT, entry.currentFile), "utf8"),
  ) as StructuredDocument;
  const label = JSON.parse(
    fs.readFileSync(path.join(CORPUS_ROOT, entry.labelFile), "utf8"),
  ) as PairLabel;
  return {
    pairId,
    description: entry.description,
    tags: entry.tags,
    prior,
    current,
    label,
  };
}

export function loadAllPairs(): PairBundle[] {
  return loadManifest().pairs.map((e) => loadPair(e.pairId));
}

/** A single expected change considered matched/missed by the engine output. */
export interface MatchVerdict {
  expected: ExpectedChange;
  matchedBy: Change | null;
  isHit: boolean;
}

/**
 * Match expected → actual. We use a lightweight matcher that requires the
 * actual Change to share category, intersect with the same severity tier
 * for CRITICAL items, and (when present) contain the expected text fragments.
 *
 * KNOWN LIMITATION (characterized 2026-05-30, bug-hunt pass 48): `evaluatePair`
 * assigns greedily (first compatible unmatched actual per expected, in order),
 * which is NOT an optimal bipartite assignment. With OVERLAPPING text
 * fragments it can strand a later expected and report a false MISS. This is
 * deliberately left as-is because the error direction is CONSERVATIVE: a false
 * miss makes the audit *fail loudly* (never falsely pass), so it cannot hide a
 * real critical miss — worst case it cries wolf, which is immediately visible
 * and fixable. The real corpus has no such fragment-overlap collision (it
 * passes at 100%). If a future corpus addition triggers a spurious miss,
 * upgrade to an optimal (Hungarian) assignment then — not speculatively.
 */
export function matchExpectedAgainstActual(
  expected: ExpectedChange,
  actuals: ReadonlyArray<Change>,
): Change | null {
  for (const a of actuals) {
    if (a.category !== expected.category) continue;
    if (expected.severity === "CRITICAL" && a.severity !== "CRITICAL") continue;

    // Change-type compatibility: exact match, except a MOVE may satisfy an
    // INSERT or DELETE that's actually a move.
    const compatibleType =
      a.changeType === expected.changeType ||
      (a.changeType === "MOVE" &&
        (expected.changeType === "INSERT" || expected.changeType === "DELETE"));
    if (!compatibleType) continue;

    if (expected.expectedTextFragments && expected.expectedTextFragments.length > 0) {
      const haystack = [a.beforeText ?? "", a.afterText ?? ""].join("\n");
      if (!expected.expectedTextFragments.every((frag) => haystack.includes(frag))) continue;
    }

    return a;
  }
  return null;
}

export interface PairMetrics {
  pairId: string;
  expectedCount: number;
  actualCount: number;
  hits: number;
  missed: ExpectedChange[];
  missedCritical: ExpectedChange[];
  /** Actuals that did not match any expected (false positives). */
  unmatchedActuals: Change[];
  /** Per-severity hits. */
  hitsBySeverity: Record<Severity, number>;
  /** True when this pair is a "null" pair (no expected changes). */
  isNullPair: boolean;
}

export interface CorpusMetrics {
  totalExpected: number;
  totalActual: number;
  totalHits: number;
  totalMissed: number;
  criticalExpected: number;
  criticalMissed: number;
  /** Sum of unmatched actuals across all pairs. */
  totalFalsePositives: number;
  /** False positives on the "null" pairs specifically. */
  falsePositivesOnNullPairs: number;
  recall: number;
  precision: number;
  pairs: PairMetrics[];
}

export function evaluatePair(bundle: PairBundle, engineOutput: DiffResult): PairMetrics {
  const expected = bundle.label.expectedChanges;
  const actuals = [...engineOutput.changes];
  const matchedActuals = new Set<Change>();
  const hits: ExpectedChange[] = [];
  const missed: ExpectedChange[] = [];

  for (const exp of expected) {
    const remaining = actuals.filter((a) => !matchedActuals.has(a));
    const m = matchExpectedAgainstActual(exp, remaining);
    if (m) {
      matchedActuals.add(m);
      hits.push(exp);
    } else {
      missed.push(exp);
    }
  }

  const missedCritical = missed.filter((m) => m.severity === "CRITICAL" && m.mustDetect);
  const unmatchedActuals = actuals.filter((a) => !matchedActuals.has(a));
  const isNullPair = expected.length === 0;

  return {
    pairId: bundle.pairId,
    expectedCount: expected.length,
    actualCount: actuals.length,
    hits: hits.length,
    missed,
    missedCritical,
    unmatchedActuals,
    hitsBySeverity: {
      CRITICAL: hits.filter((h) => h.severity === "CRITICAL").length,
      NORMAL: hits.filter((h) => h.severity === "NORMAL").length,
    },
    isNullPair,
  };
}

export interface RunOptions {
  pairs?: ReadonlyArray<string>;
}

export function runCorpusAgainstEngine(engine: IDiffEngine, opts: RunOptions = {}): CorpusMetrics {
  const bundles = opts.pairs ? opts.pairs.map(loadPair) : loadAllPairs();
  const pairMetrics: PairMetrics[] = [];
  for (const b of bundles) {
    const result = engine.diff(b.current, b.prior);
    pairMetrics.push(evaluatePair(b, result));
  }

  const totalExpected = pairMetrics.reduce((n, p) => n + p.expectedCount, 0);
  const totalActual = pairMetrics.reduce((n, p) => n + p.actualCount, 0);
  const totalHits = pairMetrics.reduce((n, p) => n + p.hits, 0);
  const totalMissed = totalExpected - totalHits;
  const criticalExpected = pairMetrics.reduce(
    (n, p) => n + p.hitsBySeverity.CRITICAL + p.missedCritical.length,
    0,
  );
  const criticalMissed = pairMetrics.reduce((n, p) => n + p.missedCritical.length, 0);
  const totalFalsePositives = pairMetrics.reduce((n, p) => n + p.unmatchedActuals.length, 0);
  const falsePositivesOnNullPairs = pairMetrics
    .filter((p) => p.isNullPair)
    .reduce((n, p) => n + p.unmatchedActuals.length, 0);

  return {
    totalExpected,
    totalActual,
    totalHits,
    totalMissed,
    criticalExpected,
    criticalMissed,
    totalFalsePositives,
    falsePositivesOnNullPairs,
    recall: totalExpected === 0 ? 1 : totalHits / totalExpected,
    precision: totalActual === 0 ? 1 : totalHits / totalActual,
    pairs: pairMetrics,
  };
}

export function formatMetrics(m: CorpusMetrics): string {
  const lines: string[] = [];
  lines.push("=== Corpus Metrics ===");
  lines.push(`Pairs:              ${m.pairs.length}`);
  lines.push(`Expected changes:   ${m.totalExpected}`);
  lines.push(`Actual changes:     ${m.totalActual}`);
  lines.push(`Hits:               ${m.totalHits}`);
  lines.push(`Missed (total):     ${m.totalMissed}`);
  lines.push(`Critical expected:  ${m.criticalExpected}`);
  lines.push(`Critical missed:    ${m.criticalMissed}   <-- HARD FLOOR: must be 0`);
  lines.push(`False positives:    ${m.totalFalsePositives}`);
  lines.push(`FP on null pairs:   ${m.falsePositivesOnNullPairs}  <-- HARD FLOOR: must be 0`);
  lines.push(`Recall:             ${(m.recall * 100).toFixed(2)}%   <-- must be ≥98%`);
  lines.push(`Precision:          ${(m.precision * 100).toFixed(2)}%`);
  if (m.criticalMissed > 0) {
    lines.push("");
    lines.push("--- Critical misses ---");
    for (const p of m.pairs) {
      for (const c of p.missedCritical) {
        lines.push(`  [${p.pairId}] ${c.summary}`);
      }
    }
  }
  return lines.join("\n");
}

import type { Comparable } from "./schema";

/**
 * User-configurable adjustment rules. `AdjustmentProfile` mirrors the
 * `adjustment_profiles` DB row minus metadata. Defaults below are only used
 * when the user hasn't set anything (new signups get a profile seeded).
 */
export type AdjustmentProfile = {
  perGlaSqftCents: number;
  perBedCents: number;
  perFullBathCents: number;
  perHalfBathCents: number;
  perGarageStallCents: number;
  perLotSqftCents: number;
  perConditionStepCents: number;
  perQualityStepCents: number;
  annualAppreciationBps: number;
};

export const DEFAULT_PROFILE: AdjustmentProfile = {
  perGlaSqftCents: 5000,
  perBedCents: 500000,
  perFullBathCents: 750000,
  perHalfBathCents: 300000,
  perGarageStallCents: 400000,
  perLotSqftCents: 100,
  perConditionStepCents: 1500000,
  perQualityStepCents: 2000000,
  annualAppreciationBps: 300,
};

export type Subject = {
  gla: number;
  beds: number;
  bathsFull: number;
  bathsHalf: number;
  garageStalls: number;
  lotSqft: number | null;
  condition: string | null;  // "C1"–"C6"
  quality: string | null;    // "Q1"–"Q6"
};

export type AdjustmentRow = {
  label: string;
  subjectVal: string;
  compVal: string;
  adjCents: number;
};

function numericRank(code: string | null, prefix: string): number | null {
  if (!code) return null;
  const m = code.match(new RegExp(`${prefix}([1-6])`));
  return m ? Number(m[1]) : null;
}

function monthsBetween(d: Date | null): number {
  if (!d) return 0;
  const ms = Date.now() - d.getTime();
  if (ms <= 0) return 0;
  return ms / (1000 * 60 * 60 * 24 * 30.4375);
}

export function computeCompAdjustments(subject: Subject, c: Comparable, profile: AdjustmentProfile = DEFAULT_PROFILE) {
  const glaDelta = subject.gla - c.gla;
  const bedDelta = subject.beds - c.beds;
  const fbDelta = subject.bathsFull - c.bathsFull;
  const hbDelta = subject.bathsHalf - c.bathsHalf;
  const gsDelta = subject.garageStalls - c.garageStalls;
  const lotDelta = subject.lotSqft != null && c.lotSqft != null ? subject.lotSqft - c.lotSqft : 0;

  // Condition / quality: subject C3 vs comp C4 = +1 step for the subject, so
  // positive adj (the comp "should have sold higher" to match the subject).
  const subjCond = numericRank(subject.condition, "C");
  const compCond = numericRank(c.condition, "C");
  // Lower code is BETTER (C1 is best), so direction is comp - subject.
  const condDelta = subjCond != null && compCond != null ? compCond - subjCond : 0;

  const subjQual = numericRank(subject.quality, "Q");
  const compQual = numericRank(c.quality, "Q");
  const qualDelta = subjQual != null && compQual != null ? compQual - subjQual : 0;

  // Time adjustment from sale date → today at the user's annual appreciation rate.
  const months = monthsBetween(c.saleDate);
  const annualRate = profile.annualAppreciationBps / 10000;
  const timeAdjCents = Math.round(c.salePriceCents * (Math.pow(1 + annualRate, months / 12) - 1));

  const rows: AdjustmentRow[] = [
    { label: "Time (months)",  subjectVal: "—",                                                   compVal: months ? months.toFixed(1) : "0",                          adjCents: timeAdjCents },
    { label: "GLA (sqft)",     subjectVal: String(subject.gla),                                  compVal: String(c.gla),                                             adjCents: glaDelta * profile.perGlaSqftCents },
    { label: "Bedrooms",       subjectVal: String(subject.beds),                                 compVal: String(c.beds),                                            adjCents: bedDelta * profile.perBedCents },
    { label: "Full baths",     subjectVal: String(subject.bathsFull),                            compVal: String(c.bathsFull),                                       adjCents: fbDelta * profile.perFullBathCents },
    { label: "Half baths",     subjectVal: String(subject.bathsHalf),                            compVal: String(c.bathsHalf),                                       adjCents: hbDelta * profile.perHalfBathCents },
    { label: "Garage stalls",  subjectVal: String(subject.garageStalls),                         compVal: String(c.garageStalls),                                    adjCents: gsDelta * profile.perGarageStallCents },
    { label: "Lot (sqft)",     subjectVal: subject.lotSqft == null ? "—" : String(subject.lotSqft), compVal: c.lotSqft == null ? "—" : String(c.lotSqft),               adjCents: lotDelta * profile.perLotSqftCents },
    { label: "Condition",      subjectVal: subject.condition ?? "—",                             compVal: c.condition ?? "—",                                        adjCents: condDelta * profile.perConditionStepCents },
    { label: "Quality",        subjectVal: subject.quality ?? "—",                               compVal: c.quality ?? "—",                                          adjCents: qualDelta * profile.perQualityStepCents },
  ];

  const gross = rows.reduce((s, r) => s + Math.abs(r.adjCents), 0);
  const net = rows.reduce((s, r) => s + r.adjCents, 0);
  const adjustedPrice = c.salePriceCents + net;

  return {
    rows,
    grossAdjustmentCents: gross,
    netAdjustmentCents: net,
    grossAdjustmentPct: c.salePriceCents ? (gross / c.salePriceCents) * 100 : 0,
    netAdjustmentPct: c.salePriceCents ? (net / c.salePriceCents) * 100 : 0,
    adjustedPriceCents: adjustedPrice,
  };
}

export function reconcileValue(adjustedPrices: number[]): number {
  if (adjustedPrices.length === 0) return 0;
  const avg = adjustedPrices.reduce((s, p) => s + p, 0) / adjustedPrices.length;
  return Math.round(avg / 100000) * 100000; // round to nearest $1000
}

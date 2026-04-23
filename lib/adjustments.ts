import type { Comparable } from "./schema";

export const DEFAULT_ADJUSTMENTS = {
  perGlaSqftCents: 5000,          // $50/sqft GLA delta
  perBedCents: 500000,            // $5k/bed delta
  perFullBathCents: 750000,       // $7.5k/full bath
  perHalfBathCents: 300000,       // $3k/half bath
  perGarageStallCents: 400000,    // $4k/stall
  perLotSqftCents: 100,           // $1/sqft lot
};

export type Subject = {
  gla: number;
  beds: number;
  bathsFull: number;
  bathsHalf: number;
  garageStalls: number;
  lotSqft: number | null;
};

export type AdjustmentRow = {
  label: string;
  subjectVal: string;
  compVal: string;
  adjCents: number;
};

export function computeCompAdjustments(subject: Subject, c: Comparable) {
  const a = DEFAULT_ADJUSTMENTS;
  const glaDelta = subject.gla - c.gla;
  const bedDelta = subject.beds - c.beds;
  const fbDelta = subject.bathsFull - c.bathsFull;
  const hbDelta = subject.bathsHalf - c.bathsHalf;
  const gsDelta = subject.garageStalls - c.garageStalls;
  const lotDelta = subject.lotSqft != null && c.lotSqft != null ? subject.lotSqft - c.lotSqft : 0;

  const rows: AdjustmentRow[] = [
    { label: "GLA (sqft)",    subjectVal: String(subject.gla),        compVal: String(c.gla),        adjCents: glaDelta * a.perGlaSqftCents },
    { label: "Bedrooms",      subjectVal: String(subject.beds),       compVal: String(c.beds),       adjCents: bedDelta * a.perBedCents },
    { label: "Full baths",    subjectVal: String(subject.bathsFull),  compVal: String(c.bathsFull),  adjCents: fbDelta  * a.perFullBathCents },
    { label: "Half baths",    subjectVal: String(subject.bathsHalf),  compVal: String(c.bathsHalf),  adjCents: hbDelta  * a.perHalfBathCents },
    { label: "Garage stalls", subjectVal: String(subject.garageStalls),compVal: String(c.garageStalls),adjCents: gsDelta * a.perGarageStallCents },
    { label: "Lot (sqft)",    subjectVal: subject.lotSqft == null ? "—" : String(subject.lotSqft), compVal: c.lotSqft == null ? "—" : String(c.lotSqft), adjCents: lotDelta * a.perLotSqftCents },
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

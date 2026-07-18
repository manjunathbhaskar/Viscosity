// Shared scoring primitives — kept separate so cold-start.ts, three-axis.ts, and
// trust-score.ts all narrow/widen intervals the same way instead of drifting.

export interface IntervalWidthParams {
  floor?: number; // minimum half-width even with abundant evidence
  ceiling?: number; // half-width at zero evidence
  decayPerUnit?: number; // how fast the interval narrows per additional evidence unit
}

export function intervalHalfWidth(evidenceCount: number, params: IntervalWidthParams = {}): number {
  const { floor = 8, ceiling = 45, decayPerUnit = 4 } = params;
  return floor + (ceiling - floor) * Math.exp(-evidenceCount / decayPerUnit);
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// Weighted-average valence scorer shared by any "score a bag of claims" path.
// Each claim contributes `value` (0..1) at weight = claim.confidence, so a
// confidently-sourced claim moves the score more than a shaky one.
export function weightedValence(entries: { value: number; weight: number }[]): number {
  if (entries.length === 0) return 0.5;
  const sum = entries.reduce((acc, e) => acc + e.value * e.weight, 0);
  const weight = entries.reduce((acc, e) => acc + e.weight, 0);
  return weight > 0 ? sum / weight : 0.5;
}

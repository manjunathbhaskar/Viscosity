// 3-axis scorer — Founder / Market / Idea-vs-Market. Deliberately never
// collapses into one number: a single blended score hides exactly the
// disagreement an investor needs to see. Each axis ships its own score,
// interval, trend, and confidence, computed independently.

import type { AxisScore, Claim, ProcessSignal, ScoredInterval, ThreeAxisScore } from "@/lib/types";
import { computeColdStartScore, deriveProcessSignals, isColdStart } from "./cold-start";
import { clamp, intervalHalfWidth, weightedValence } from "./shared";

const MARKET_POSITIVE = /\b(growing market|large tam|expanding|tailwind|underserved|land grab|category creation)\b/i;
const MARKET_NEGATIVE = /\b(shrinking|saturated|commodit(y|ized)|crowded|regulatory headwind|declining)\b/i;

const FIT_POSITIVE = /\b(paying customers?|retention|repeat usage|organic pull|waitlist|design partner|signed pilot)\b/i;
const FIT_NEGATIVE = /\b(no users|churned|pivot(ed)?|no demand|feature creep|unclear icp)\b/i;

function claimValence(claim: Claim, positive: RegExp, negative: RegExp): { value: number; weight: number } | null {
  const isPos = positive.test(claim.text);
  const isNeg = negative.test(claim.text);
  if (!isPos && !isNeg) return null;
  const value = isPos && !isNeg ? 0.5 + 0.5 * claim.confidence : isNeg && !isPos ? 0.5 - 0.5 * claim.confidence : 0.5;
  return { value, weight: claim.confidence };
}

function scoreFromClaims(claims: Claim[], positive: RegExp, negative: RegExp, basisLabel: string): AxisScore {
  const entries = claims.map((c) => claimValence(c, positive, negative)).filter((e): e is { value: number; weight: number } => e !== null);

  if (entries.length === 0) {
    return { score: 50, low: 10, high: 90, trend: "flat", confidence: 0.1, basis: `no evidence yet — ${basisLabel}` };
  }

  const normalized = weightedValence(entries);
  const score = Math.round(normalized * 100);
  const halfWidth = intervalHalfWidth(entries.length, { floor: 6, ceiling: 40, decayPerUnit: 3 });
  const confidence = clamp(0.2 + entries.length * 0.08, 0.2, 0.95);

  return {
    score,
    low: Math.max(0, Math.round(score - halfWidth)),
    high: Math.min(100, Math.round(score + halfWidth)),
    trend: "flat", // trend is set by lib/memory/founder-score.ts on repeat scoring, not on first pass
    confidence,
    basis: `${entries.length} ${basisLabel} claim${entries.length === 1 ? "" : "s"}`,
  };
}

function coldStartToAxis(interval: ScoredInterval, label: string): AxisScore {
  return {
    score: interval.score,
    low: interval.low,
    high: interval.high,
    trend: "flat",
    confidence: clamp(0.15 + interval.signalCount * 0.06, 0.15, 0.85),
    basis:
      interval.signalCount === 0
        ? `${label}: zero data — neutral prior, wide interval by design`
        : `${label}: ${interval.signalCount} process signal${interval.signalCount === 1 ? "" : "s"} (cold-start path)`,
  };
}

function identityToAxis(identitySignals: ProcessSignal[], label: string): AxisScore {
  const entries = identitySignals.map((s) => ({ value: s.value, weight: s.weight }));
  const normalized = weightedValence(entries);
  const score = Math.round(normalized * 100);
  const halfWidth = intervalHalfWidth(identitySignals.length, { floor: 5, ceiling: 30, decayPerUnit: 3 });
  return {
    score,
    low: Math.max(0, Math.round(score - halfWidth)),
    high: Math.min(100, Math.round(score + halfWidth)),
    trend: "flat",
    confidence: clamp(0.3 + identitySignals.length * 0.08, 0.3, 0.95),
    basis: `${label}: ${identitySignals.length} identity signal${identitySignals.length === 1 ? "" : "s"}`,
  };
}

// Buckets a raw claim into which axis it's evidence for — used by
// agent/crew/pipeline.ts to split enrichment claims before scoring. Falls
// back to "founder" (process/shipping evidence) since that's what
// founder-enrichment.ts predominantly produces.
export function classifyClaim(claim: Claim): "market" | "idea" | "founder" {
  if (MARKET_POSITIVE.test(claim.text) || MARKET_NEGATIVE.test(claim.text)) return "market";
  if (FIT_POSITIVE.test(claim.text) || FIT_NEGATIVE.test(claim.text)) return "idea";
  return "founder";
}

export interface ThreeAxisInput {
  founderClaims: Claim[]; // raw claims about the founder — cold-start extracts process signals from these
  identitySignals?: ProcessSignal[]; // funding history, GitHub stars, follower counts — absent for true cold-start
  marketClaims: Claim[];
  ideaFitClaims: Claim[];
}

export function computeThreeAxisScore(input: ThreeAxisInput): ThreeAxisScore {
  const identitySignals = input.identitySignals ?? [];
  const coldStart = isColdStart(identitySignals.length);

  const founder: AxisScore = coldStart
    ? coldStartToAxis(computeColdStartScore(deriveProcessSignals(input.founderClaims)), "founder")
    : blendFounderAxis(input.founderClaims, identitySignals);

  const market = scoreFromClaims(input.marketClaims, MARKET_POSITIVE, MARKET_NEGATIVE, "market");
  const ideaVsMarket = scoreFromClaims(input.ideaFitClaims, FIT_POSITIVE, FIT_NEGATIVE, "idea-market fit");

  return { founder, market, ideaVsMarket, computedAt: new Date().toISOString() };
}

// When identity signals DO exist, blend them with process signals rather than
// discarding the process read — a founder with funding history still benefits
// from "are they actually shipping right now" evidence.
function blendFounderAxis(founderClaims: Claim[], identitySignals: ProcessSignal[]): AxisScore {
  const process = computeColdStartScore(deriveProcessSignals(founderClaims));
  const identity = identityToAxis(identitySignals, "founder");

  const processWeight = 0.4;
  const identityWeight = 0.6;
  const score = Math.round(process.score * processWeight + identity.score * identityWeight);
  const low = Math.round(process.low * processWeight + identity.low * identityWeight);
  const high = Math.round(process.high * processWeight + identity.high * identityWeight);

  return {
    score,
    low: Math.max(0, low),
    high: Math.min(100, high),
    trend: "flat",
    confidence: clamp((process.signalCount > 0 ? 0.5 : 0.3) + identitySignals.length * 0.07, 0.3, 0.95),
    basis: `blended: ${identitySignals.length} identity signals + ${process.signalCount} process signals`,
  };
}

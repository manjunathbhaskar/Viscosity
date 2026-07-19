// 3-axis scorer — Founder / Market / Idea-vs-Market. Deliberately never
// collapses into one number: a single blended score hides exactly the
// disagreement an investor needs to see. Each axis ships its own score,
// interval, trend, and confidence, computed independently.

import type { AxisScore, Claim, ProcessSignal, ScoredInterval, ThreeAxisScore } from "@/lib/types";
import { computeColdStartScore, deriveProcessSignals, isColdStart } from "./cold-start";
import { clamp, intervalHalfWidth, weightedValence } from "./shared";

// Broad on purpose: real web/news text about a market almost never uses the
// literal phrase "growing market" — it says "expected to reach $X billion,"
// "CAGR of N%," "increasing demand," etc. Narrow patterns here just starve
// the market axis of any evidence (every claim falls through to the 50/wide
// "no evidence yet" default), which looks broken even though the math is
// fine — the real bug was too little signal ever reaching it. See also the
// dedicated market-signal pulse query in agent/tools/founder-enrichment.ts,
// which now actually fetches market-shaped content for this to classify.
const MARKET_POSITIVE =
  /\b(growing market|large tam|expanding market|expanding demand|tailwind|underserved|land grab|category creation|market (size|growth)|billion(-|\s)dollar market|cagr|increasing demand|rising demand|growing demand|market opportunity|total addressable market|fast(-|\s)growing (industry|sector|market)|emerging (market|category)|industry (growth|tailwind))\b/i;
const MARKET_NEGATIVE =
  /\b(shrinking|saturated|commodit(y|ized)|crowded market|regulatory headwind|declining market|market (decline|contraction)|well(-|\s)funded (rivals|competitors)|fragmented market|price war|race to the bottom|winner(-|\s)take(s)?(-|\s)all)\b/i;

const FIT_POSITIVE =
  /\b(paying customers?|retention|repeat usage|organic pull|waitlist|design partner|signed pilot|product(-|\s)market fit|strong adoption|growing user base|word of mouth|customers? love|high engagement)\b/i;
const FIT_NEGATIVE =
  /\b(no users|churned|pivot(ed)?|no demand|feature creep|unclear icp|low engagement|struggling to find|hasn'?t found (product|market) fit|failed to gain traction)\b/i;

// Every claim reaching this function is already known to be on-topic (it was
// either explicitly fetched by a dedicated market/product-fit pulse query —
// see founder-enrichment.ts — or matched the sentiment regex below via
// classifyClaim). So a claim that doesn't hit either regex is NOT dropped:
// free-form web text about a real market almost never contains a clean
// sentiment trigger phrase ("market projected to grow 40%, $74B by 2030"
// matches neither "growing market" nor "declining market" literally), and
// silently discarding it is what left this axis pinned at the zero-evidence
// default for every founder. It counts as neutral evidence at reduced
// weight instead — narrows the interval a little, without asserting a
// sentiment the text doesn't actually support.
function claimValence(claim: Claim, positive: RegExp, negative: RegExp): { value: number; weight: number } {
  const isPos = positive.test(claim.text);
  const isNeg = negative.test(claim.text);
  if (isPos && !isNeg) return { value: 0.5 + 0.5 * claim.confidence, weight: claim.confidence };
  if (isNeg && !isPos) return { value: 0.5 - 0.5 * claim.confidence, weight: claim.confidence };
  return { value: 0.5, weight: claim.confidence * 0.4 };
}

function scoreFromClaims(claims: Claim[], positive: RegExp, negative: RegExp, basisLabel: string): AxisScore {
  if (claims.length === 0) {
    return { score: 50, low: 10, high: 90, trend: "flat", confidence: 0.1, basis: `no evidence yet — ${basisLabel}` };
  }

  const entries = claims.map((c) => claimValence(c, positive, negative));

  const normalized = weightedValence(entries);
  const score = Math.round(normalized * 100);
  const halfWidth = intervalHalfWidth(entries.length, { floor: 6, ceiling: 40, decayPerUnit: 3 });
  // Steeper than the old 0.07/claim slope: the dedicated market/product pulse
  // queries (agent/tools/founder-enrichment.ts) only ever return ~3-5
  // findings each, so the old curve capped confidence around 40% even for a
  // fully-evidenced axis — every deal looked equally "unsure" regardless of
  // how much real signal actually came back.
  const confidence = clamp(0.2 + entries.length * 0.13, 0.2, 0.92);

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
//
// The "Market signal:" / "Product signal:" prefixes come from dedicated
// pulse queries in founder-enrichment.ts that already searched specifically
// for market-sizing / product-adoption content — we know the topic for
// those without needing the sentiment regex to also happen to match, which
// is what previously starved these two axes of any evidence at all (see
// claimValence in this file for the other half of that fix).
export function classifyClaim(claim: Claim): "market" | "idea" | "founder" {
  if (claim.text.startsWith("Market signal:")) return "market";
  if (claim.text.startsWith("Product signal:")) return "idea";
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

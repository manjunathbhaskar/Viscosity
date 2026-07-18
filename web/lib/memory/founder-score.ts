// Makes the Founder Score genuinely persistent and strengthening across
// applications, instead of a fresh calculation each time: a persistent record
// that survives across runs, updated with a spaced-repetition-style rhythm —
// agreement narrows the confidence interval and grows an ease factor;
// contradiction widens the interval and resets repetitions. This is
// deliberately a simplified analogue of SM-2 spaced repetition, not a literal
// port — VC Brain scores are 3-axis intervals, not single facts.

import type { AxisScore, ThreeAxisScore } from "@/lib/types";
import type { FounderScoreRecord } from "./schema";

const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const HISTORY_CAP = 30;

function axesAgree(a: AxisScore, b: AxisScore): boolean {
  // Agreement = overlapping confidence intervals and scores within 15 points.
  const overlap = a.low <= b.high && b.low <= a.high;
  const close = Math.abs(a.score - b.score) <= 15;
  return overlap && close;
}

function scoreAgreement(prev: ThreeAxisScore, next: ThreeAxisScore): boolean {
  return (
    axesAgree(prev.founder, next.founder) &&
    axesAgree(prev.market, next.market) &&
    axesAgree(prev.ideaVsMarket, next.ideaVsMarket)
  );
}

function narrowAxis(axis: AxisScore, easeFactor: number): AxisScore {
  // Higher ease -> tighter interval, capped so it never collapses to a false point estimate.
  const width = axis.high - axis.low;
  const shrink = Math.min(0.35, (easeFactor - MIN_EASE) / (MAX_EASE - MIN_EASE) * 0.35);
  const newWidth = Math.max(width * (1 - shrink), 6);
  const mid = axis.score;
  return {
    ...axis,
    low: Math.max(0, mid - newWidth / 2),
    high: Math.min(100, mid + newWidth / 2),
    confidence: Math.min(0.97, axis.confidence + shrink * 0.4),
  };
}

function widenAxis(axis: AxisScore): AxisScore {
  const width = axis.high - axis.low;
  const newWidth = Math.min(60, width * 1.4 + 5);
  const mid = axis.score;
  return {
    ...axis,
    low: Math.max(0, mid - newWidth / 2),
    high: Math.min(100, mid + newWidth / 2),
    confidence: Math.max(0.15, axis.confidence - 0.15),
    trend: "flat",
  };
}

export function initFounderScoreRecord(founderId: string, score: ThreeAxisScore): FounderScoreRecord {
  return {
    founderId,
    latest: score,
    history: [{ at: score.computedAt, score }],
    repetitions: 0,
    easeFactor: 2.0,
    updatedAt: score.computedAt,
  };
}

// Called every time a founder is re-screened (new application, new enrichment pass).
// Returns the updated persistent record — this is what makes the score "never resets."
export function strengthenFounderScore(
  existing: FounderScoreRecord,
  incoming: ThreeAxisScore
): FounderScoreRecord {
  const agrees = scoreAgreement(existing.latest, incoming);

  const repetitions = agrees ? existing.repetitions + 1 : 0;
  const easeFactor = agrees
    ? Math.min(MAX_EASE, existing.easeFactor + 0.15)
    : Math.max(MIN_EASE, existing.easeFactor - 0.3);

  const withTrend = (prevAxis: AxisScore, nextAxis: AxisScore): AxisScore => ({
    ...nextAxis,
    trend: nextAxis.score > prevAxis.score + 3 ? "up" : nextAxis.score < prevAxis.score - 3 ? "down" : "flat",
  });

  let merged: ThreeAxisScore = {
    founder: withTrend(existing.latest.founder, incoming.founder),
    market: withTrend(existing.latest.market, incoming.market),
    ideaVsMarket: withTrend(existing.latest.ideaVsMarket, incoming.ideaVsMarket),
    computedAt: incoming.computedAt,
  };

  merged = agrees
    ? {
        founder: narrowAxis(merged.founder, easeFactor),
        market: narrowAxis(merged.market, easeFactor),
        ideaVsMarket: narrowAxis(merged.ideaVsMarket, easeFactor),
        computedAt: merged.computedAt,
      }
    : {
        founder: widenAxis(merged.founder),
        market: widenAxis(merged.market),
        ideaVsMarket: widenAxis(merged.ideaVsMarket),
        computedAt: merged.computedAt,
      };

  const history = [...existing.history, { at: incoming.computedAt, score: merged }].slice(-HISTORY_CAP);

  return {
    founderId: existing.founderId,
    latest: merged,
    history,
    repetitions,
    easeFactor,
    updatedAt: incoming.computedAt,
  };
}

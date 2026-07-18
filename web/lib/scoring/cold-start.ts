// Cold-start / process-signal scoring path — the biggest risk of scoring
// poorly if skipped, since most founders at first signal have zero funding
// history, zero GitHub, zero network.
//
// This path deliberately never looks at identity signals (funding, follower count,
// pedigree). It scores PROCESS: shipping cadence, completion rate, response
// quality to public critique, technical writing depth, artifact-to-ship velocity.
// A founder with zero identity signal gets an honestly wide interval around a
// neutral midpoint — never a penalty for having no track record.

import type { Claim, ProcessSignal, ProcessSignalType, ScoredInterval } from "@/lib/types";
import { intervalHalfWidth } from "./shared";

const SIGNAL_WEIGHTS: Record<ProcessSignalType, number> = {
  shipping_cadence: 0.28,
  completion_rate: 0.24,
  critique_response: 0.16,
  writing_depth: 0.16,
  artifact_velocity: 0.16,
};

// Keyword heuristics for classifying raw claims into process signals when no
// structured enrichment (e.g. GitHub API) is available. This is intentionally
// simple and transparent — every classification traces back to the claim it
// came from via `evidenceClaimId`, so the Trust Score can audit it.
const SIGNAL_PATTERNS: Record<ProcessSignalType, RegExp> = {
  shipping_cadence: /\b(commit|release|shipped|deploy|changelog|version bump)\b/i,
  completion_rate: /\b(launched|finished|completed|closed|merged|v1\.0|final submission)\b/i,
  critique_response: /\b(replied to|responded to|addressed feedback|fixed after|patched following)\b/i,
  writing_depth: /\b(wrote|blog post|writeup|documentation|technical post|design doc|readme)\b/i,
  artifact_velocity: /\b(prototype|demo|mvp|proof of concept|built in|hackathon project)\b/i,
};

export function deriveProcessSignals(claims: Claim[]): ProcessSignal[] {
  const signals: ProcessSignal[] = [];
  for (const claim of claims) {
    for (const [type, pattern] of Object.entries(SIGNAL_PATTERNS) as [ProcessSignalType, RegExp][]) {
      if (pattern.test(claim.text)) {
        signals.push({
          type,
          value: Math.min(1, 0.5 + claim.confidence * 0.5), // claim confidence lifts signal strength
          weight: SIGNAL_WEIGHTS[type],
          evidenceClaimId: claim.id,
        });
      }
    }
  }
  return signals;
}

export function computeColdStartScore(signals: ProcessSignal[]): ScoredInterval {
  if (signals.length === 0) {
    // Zero data: neutral midpoint (50), maximally wide interval. Not a penalty.
    return { score: 50, low: 5, high: 95, basis: "process", signalCount: 0 };
  }

  const byType = new Map<ProcessSignalType, ProcessSignal[]>();
  for (const s of signals) {
    byType.set(s.type, [...(byType.get(s.type) ?? []), s]);
  }

  // Average within each signal type first (so repeated evidence of the same
  // process trait doesn't dominate purely by volume), then weight across types
  // that actually have evidence — missing types are simply excluded, not zeroed.
  let weightedSum = 0;
  let weightTotal = 0;
  for (const [type, group] of byType) {
    const avgValue = group.reduce((acc, s) => acc + s.value, 0) / group.length;
    const weight = SIGNAL_WEIGHTS[type];
    weightedSum += avgValue * weight;
    weightTotal += weight;
  }

  const normalized = weightTotal > 0 ? weightedSum / weightTotal : 0.5;
  const score = Math.round(normalized * 100);
  const halfWidth = intervalHalfWidth(signals.length);

  return {
    score,
    low: Math.max(0, Math.round(score - halfWidth)),
    high: Math.min(100, Math.round(score + halfWidth)),
    basis: "process",
    signalCount: signals.length,
  };
}

// True cold-start = zero identity signals available (no funding/network data at all).
// The Screening step calls this to decide which scoring path to route a founder
// through — see agent/crew/pipeline.ts.
export function isColdStart(identitySignalCount: number): boolean {
  return identitySignalCount === 0;
}

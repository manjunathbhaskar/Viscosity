// Self-Correction Loop / Validator Agent (stretch goal #2). TIER 2 — the
// module boundary and one real check are implemented; the rest is stubbed.
// To complete: wire a comparable-rounds dataset (Crunchbase/PitchBook export
// or manual comps list) and add cross-checks against it in `checkAgainstComps`.

import type { Claim, ThreeAxisScore } from "@/lib/types";

export interface ValidationFinding {
  check: string;
  passed: boolean;
  detail: string;
}

// REAL check: internal consistency — does the memo's traction narrative agree
// with the claims that back the Idea-vs-Market axis? A cheap but genuine
// self-correction pass: if traction claims say "no users" but the idea axis
// scored positively (or vice versa), flag it before the memo ships.
export function checkInternalConsistency(claims: Claim[], axisScore: ThreeAxisScore): ValidationFinding {
  const negativeTraction = claims.some((c) => /\b(no users|churned|no demand)\b/i.test(c.text));
  const positiveAxis = axisScore.ideaVsMarket.score >= 60;
  if (negativeTraction && positiveAxis) {
    return {
      check: "internal_consistency",
      passed: false,
      detail: "Idea-vs-Market axis scored positively despite a claim indicating no users/demand — review before shipping memo.",
    };
  }
  return { check: "internal_consistency", passed: true, detail: "No contradiction found between traction claims and Idea-vs-Market axis." };
}

// STUB — real implementation needs a comparable-rounds dataset that doesn't
// exist in this build. Returns a clearly-labeled "not evaluated" finding
// rather than fabricating a comparison.
export function checkAgainstComps(): ValidationFinding {
  return {
    check: "comparable_rounds",
    passed: true,
    detail: "NOT EVALUATED — no comparable-rounds dataset wired up yet (Tier 2 stub, see lib/validator-agent.ts).",
  };
}

export function runValidatorAgent(claims: Claim[], axisScore: ThreeAxisScore): ValidationFinding[] {
  return [checkInternalConsistency(claims, axisScore), checkAgainstComps()];
}

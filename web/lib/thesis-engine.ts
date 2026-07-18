// Thesis Engine — "ICP / Signal Map" per the rename map. A simple, legible
// filter over sourced deals: does this founder/company fit the fund's stated
// thesis well enough to move from Sourcing into Screening. Deliberately not a
// black box — every rejection/pass carries the specific rule that fired.

import type { DealRecord, Startup, ThesisConfig, ThreeAxisScore } from "@/lib/types";

export function defaultThesis(): ThesisConfig {
  return {
    name: "Maschmeyer Group — pre-seed AI/software",
    sectors: ["ai", "developer tools", "fintech", "b2b saas", "infra"],
    stageMin: "pre-seed",
    stageMax: "seed",
    checkSizeUsd: 100_000,
    mustHave: ["technical founder", "shipped artifact"],
    niceToHave: ["prior exit", "domain expertise", "warm intro"],
  };
}

export interface ThesisFitResult {
  fits: boolean;
  reasons: string[];
  score: number; // 0..1, soft fit strength — not used to gate, only to rank the queue
}

export function evaluateThesisFit(thesis: ThesisConfig, company: Startup, axisScore: ThreeAxisScore): ThesisFitResult {
  const reasons: string[] = [];
  let hits = 0;
  let checks = 0;

  checks++;
  const sectorMatch = thesis.sectors.some((s) => (company.oneLiner ?? "").toLowerCase().includes(s));
  if (sectorMatch) {
    hits++;
    reasons.push("sector matches thesis");
  } else {
    reasons.push("sector not clearly stated or off-thesis — verify in Screening");
  }

  checks++;
  if (axisScore.founder.score >= 40) {
    hits++;
    reasons.push(`founder axis ${axisScore.founder.score} (${axisScore.founder.basis})`);
  } else {
    reasons.push(`founder axis low (${axisScore.founder.score}) — weak or thin process signal`);
  }

  checks++;
  if (axisScore.ideaVsMarket.score >= 35) {
    hits++;
    reasons.push(`idea-market fit axis ${axisScore.ideaVsMarket.score}`);
  } else {
    reasons.push(`idea-market fit axis low or unevidenced (${axisScore.ideaVsMarket.score})`);
  }

  const score = hits / checks;
  return { fits: score >= 0.5, reasons, score };
}

export function rankDecisionQueue(deals: { deal: DealRecord; fit: ThesisFitResult }[]): DealRecord[] {
  return [...deals]
    .sort((a, b) => b.fit.score - a.fit.score)
    .map((d) => d.deal);
}

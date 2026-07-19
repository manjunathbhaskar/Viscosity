// The unified Memory layer schema — a persistent store that never resets
// between runs, and strengthens founder scores with repeated corroboration.
// See docs/ARCHITECTURE.md §Memory for the full design.

import type {
  Claim,
  DealRecord,
  DealbreakerFlag,
  Founder,
  InvestmentMemo,
  SimulationRecord,
  MomentumPlan,
  Source,
  SourcingChannel,
  Startup,
  ThreeAxisScore,
  TraceabilityEntry,
  TrustScore,
} from "@/lib/types";

// A persistent, never-resets per-founder record. Strengthens (interval
// narrows, confidence rises) as claims corroborate across applications;
// widens on contradiction.
export interface FounderScoreRecord {
  founderId: string;
  latest: ThreeAxisScore;
  history: { at: string; score: ThreeAxisScore }[]; // capped at 30 — feeds axis `trend`
  repetitions: number; // SM-2-inspired: consecutive corroborating updates
  easeFactor: number; // 1.3..3.0, grows with agreement, shrinks on contradiction
  updatedAt: string;
}

export interface MemoryState {
  founders: Founder[];
  companies: Startup[];
  claims: Claim[];
  sources: Source[];
  deals: DealRecord[];
  founderScores: FounderScoreRecord[];
  trustScores: TrustScore[];
  traceability: TraceabilityEntry[];
  memos: InvestmentMemo[];
  channels: SourcingChannel[];
  dealbreakers: DealbreakerFlag[];
  simulations: SimulationRecord[];
  momentumPlans: MomentumPlan[];
}

export function emptyMemory(): MemoryState {
  return {
    founders: [],
    companies: [],
    claims: [],
    sources: [],
    deals: [],
    founderScores: [],
    trustScores: [],
    traceability: [],
    memos: [],
    channels: [],
    dealbreakers: [],
    simulations: [],
    momentumPlans: [],
  };
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

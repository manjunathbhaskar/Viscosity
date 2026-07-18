// Agentic Traceability. Every conclusion (score, memo line, dealbreaker flag)
// cites the exact data point behind it: every Claim already carries a
// sourceId, and any conclusion that originated from the diligence engine is
// also bridged into that engine's own signal log via
// lib/diligence-bridge.ts::emitDiligenceSignal — one shared trail instead of
// two disconnected logs.

import type { Claim, Source, TraceabilityEntry } from "@/lib/types";
import { newId } from "@/lib/memory/schema";
import { emitDiligenceSignal, type VcBrainSignalType } from "@/lib/diligence-bridge";

export function buildTraceabilityEntry(params: {
  dealId: string;
  conclusion: string;
  agent: string;
  claims: Claim[];
  sources: Source[];
}): TraceabilityEntry {
  const sourceUrls = params.claims
    .map((c) => params.sources.find((s) => s.id === c.sourceId)?.url)
    .filter((u): u is string => Boolean(u));

  return {
    id: newId("trace"),
    dealId: params.dealId,
    conclusion: params.conclusion,
    claimIds: params.claims.map((c) => c.id),
    sourceUrls,
    agent: params.agent,
    at: new Date().toISOString(),
  };
}

// Bridges a conclusion into the diligence engine's own signal log so its
// signal graph reflects VC Brain's reasoning too.
export async function traceAndEmitDiligenceSignal(params: {
  dealId: string;
  conclusion: string;
  agent: string;
  claims: Claim[];
  sources: Source[];
  signalType: VcBrainSignalType;
  sourceEntity: string;
  diligenceDocId: number;
  strength: number;
}): Promise<TraceabilityEntry> {
  const entry = buildTraceabilityEntry(params);
  try {
    await emitDiligenceSignal({
      signalType: params.signalType,
      sourceEntity: params.sourceEntity,
      sourceDocId: params.diligenceDocId,
      strength: params.strength,
      payload: { conclusion: params.conclusion, claimIds: entry.claimIds },
    });
    entry.diligenceSignalType = params.signalType;
  } catch (err) {
    console.error("[traceability:emit]", err);
  }
  return entry;
}

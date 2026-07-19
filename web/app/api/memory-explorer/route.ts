import { NextResponse } from "next/server";
import { getMemory } from "@/lib/memory/store";

export const dynamic = "force-dynamic";

// Debug/ops read of the raw Memory layer — capped per collection so this
// stays fast even after a long demo session.
export async function GET() {
  const m = await getMemory();

  const founders = m.founders
    .slice(-50)
    .reverse()
    .map((f) => ({ id: f.id, name: f.name, companyIds: f.companyIds.length, sourceIds: f.sourceIds.length, updatedAt: f.updatedAt }));

  const deals = m.deals
    .slice(-50)
    .reverse()
    .map((d) => {
      const founder = m.founders.find((f) => f.id === d.founderId);
      const company = m.companies.find((c) => c.id === d.companyId);
      return { id: d.id, founder: founder?.name ?? "?", company: company?.name ?? "?", stage: d.stage, route: d.route };
    });

  const claims = m.claims
    .slice(-80)
    .reverse()
    .map((c) => ({ id: c.id, text: c.text.slice(0, 90), confidence: c.confidence, subjectType: c.subjectType }));

  const trustScores = m.trustScores
    .slice(-80)
    .reverse()
    .map((t) => ({ claimId: t.claimId, confidence: t.confidence, level: t.level }));

  const simulations = m.simulations
    .slice(-20)
    .reverse()
    .map((s) => ({ id: s.id, topic: s.topic, status: s.status, provider: s.provider, feedCount: s.feed.length, createdAt: s.createdAt }));

  const momentumPlans = m.momentumPlans
    .slice(-20)
    .reverse()
    .map((p) => ({ id: p.id, summary: p.summary, horizonDays: p.horizonDays, actionCount: p.actions.length, source: p.source }));

  return NextResponse.json({
    counts: {
      founders: m.founders.length,
      companies: m.companies.length,
      claims: m.claims.length,
      sources: m.sources.length,
      deals: m.deals.length,
      trustScores: m.trustScores.length,
      traceability: m.traceability.length,
      simulations: m.simulations.length,
      momentumPlans: m.momentumPlans.length,
      memos: m.memos.length,
    },
    founders,
    deals,
    claims,
    trustScores,
    simulations,
    momentumPlans,
  });
}

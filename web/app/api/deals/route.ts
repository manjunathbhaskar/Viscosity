import { NextResponse } from "next/server";
import { getMemory } from "@/lib/memory/store";
import { ensureDemoSeed } from "@/lib/memory/seed";

export const dynamic = "force-dynamic";

// Decision-ready queue — GET returns every deal with enough denormalized data
// for the dashboard list view without a second round trip per row.
export async function GET() {
  await ensureDemoSeed();
  const m = await getMemory();
  const deals = m.deals
    .map((d) => {
      const founder = m.founders.find((f) => f.id === d.founderId);
      const company = m.companies.find((c) => c.id === d.companyId);
      const scoreRecord = m.founderScores.find((s) => s.founderId === d.founderId);
      const dealbreakers = m.dealbreakers.filter((db) => db.dealId === d.id);
      const trace = m.traceability.filter((t) => t.dealId === d.id).sort((a, b) => (a.at < b.at ? 1 : -1));
      const axisScore = scoreRecord?.latest ?? null;
      const avgConfidence = axisScore
        ? Math.round(((axisScore.founder.confidence + axisScore.market.confidence + axisScore.ideaVsMarket.confidence) / 3) * 100)
        : 0;
      return {
        id: d.id,
        founderName: founder?.name ?? "unknown",
        companyName: company?.name ?? "unknown",
        stage: d.stage,
        route: d.route,
        axisScore,
        avgConfidence,
        criticalDealbreakers: dealbreakers.filter((db) => db.severity === "critical").length,
        redFlagScore: d.redFlagScore ?? null,
        latestTraceability: trace[0] ? { conclusion: trace[0].conclusion, sourceCount: trace[0].sourceUrls.length } : null,
        updatedAt: d.updatedAt,
      };
    })
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  return NextResponse.json({ deals });
}

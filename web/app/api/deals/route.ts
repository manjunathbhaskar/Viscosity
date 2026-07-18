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
      return {
        id: d.id,
        founderName: founder?.name ?? "unknown",
        companyName: company?.name ?? "unknown",
        stage: d.stage,
        route: d.route,
        axisScore: scoreRecord?.latest ?? null,
        criticalDealbreakers: dealbreakers.filter((db) => db.severity === "critical").length,
        updatedAt: d.updatedAt,
      };
    })
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  return NextResponse.json({ deals });
}

import { NextResponse } from "next/server";
import { updateMemory } from "@/lib/memory/store";
import { defaultThesis, evaluateThesisFit } from "@/lib/thesis-engine";

export const dynamic = "force-dynamic";

// Re-run the Screening gate on an existing deal — for when new claims/evidence
// land after the initial Sourcing pass (e.g. a founder replies with more info).
// The initial Sourcing→Screening convergence happens inline in /api/source;
// this is the re-screen path for evidence that arrives later.
export async function PATCH(req: Request) {
  const { dealId } = (await req.json()) as { dealId: string };
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

  let outcome: { fits: boolean; reasons: string[]; score: number } | null = null;

  const m = await updateMemory((mem) => {
    const deal = mem.deals.find((d) => d.id === dealId);
    if (!deal) return mem;
    const company = mem.companies.find((c) => c.id === deal.companyId);
    const scoreRecord = mem.founderScores.find((s) => s.founderId === deal.founderId);
    if (!company || !scoreRecord) return mem;

    const fit = evaluateThesisFit(defaultThesis(), company, scoreRecord.latest);
    outcome = fit;
    const hasCritical = mem.dealbreakers.some((db) => db.dealId === dealId && db.severity === "critical");
    deal.stage = fit.fits && !hasCritical ? "diligence" : "screening";
    deal.thesisFit = { fits: fit.fits, score: fit.score, reasons: fit.reasons };
    deal.updatedAt = new Date().toISOString();
  });

  const deal = m.deals.find((d) => d.id === dealId);
  return NextResponse.json({ ok: true, deal, thesisFit: outcome });
}

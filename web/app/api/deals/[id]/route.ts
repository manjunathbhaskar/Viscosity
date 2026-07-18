import { NextResponse } from "next/server";
import { getMemory } from "@/lib/memory/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await getMemory();
  const deal = m.deals.find((d) => d.id === id);
  if (!deal) return NextResponse.json({ error: "deal not found" }, { status: 404 });

  const founder = m.founders.find((f) => f.id === deal.founderId) ?? null;
  const company = m.companies.find((c) => c.id === deal.companyId) ?? null;
  const claims = m.claims.filter((c) => c.subjectId === deal.founderId);
  const sources = m.sources.filter((s) => founder?.sourceIds.includes(s.id));
  const scoreRecord = m.founderScores.find((s) => s.founderId === deal.founderId) ?? null;
  const trustScores = m.trustScores.filter((t) => claims.some((c) => c.id === t.claimId));
  const dealbreakers = m.dealbreakers.filter((db) => db.dealId === deal.id);
  const traceability = m.traceability.filter((t) => t.dealId === deal.id);
  const memo = m.memos.filter((mm) => mm.dealId === deal.id).sort((a, b) => (a.generatedAt < b.generatedAt ? 1 : -1))[0] ?? null;

  return NextResponse.json({ deal, founder, company, claims, sources, scoreRecord, trustScores, dealbreakers, traceability, memo });
}

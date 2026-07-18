import { NextResponse } from "next/server";
import { getMemory, updateMemory } from "@/lib/memory/store";
import { generateInvestmentMemo } from "@/lib/memo-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { dealId } = (await req.json()) as { dealId: string };
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

  const m = await getMemory();
  const deal = m.deals.find((d) => d.id === dealId);
  if (!deal) return NextResponse.json({ error: "deal not found" }, { status: 404 });

  const company = m.companies.find((c) => c.id === deal.companyId);
  const scoreRecord = m.founderScores.find((s) => s.founderId === deal.founderId);
  const claims = m.claims.filter((c) => c.subjectId === deal.founderId);
  if (!company || !scoreRecord) return NextResponse.json({ error: "insufficient data to generate memo" }, { status: 422 });

  const memo = await generateInvestmentMemo({
    deal,
    company,
    claims,
    axisScore: scoreRecord.latest,
    diligenceDocIds: deal.diligenceDocId ? [deal.diligenceDocId] : [],
  });

  await updateMemory((mem2) => {
    mem2.memos.push(memo);
    const d = mem2.deals.find((dd) => dd.id === dealId);
    if (d) {
      d.stage = "decision_ready";
      d.updatedAt = new Date().toISOString();
    }
  });

  return NextResponse.json({ ok: true, memo });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dealId = searchParams.get("dealId");
  const m = await getMemory();
  const memos = dealId ? m.memos.filter((mm) => mm.dealId === dealId) : m.memos;
  return NextResponse.json({ memos });
}

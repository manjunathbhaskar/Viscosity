import { NextResponse } from "next/server";
import { generateMomentumPlan, type MomentumPlanInput } from "@/lib/momentum-plan";
import { updateMemory, getMemory } from "@/lib/memory/store";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<MomentumPlanInput> & { dealId?: string };
  if (!body.companyName || !body.founderName) {
    return NextResponse.json({ ok: false, error: "companyName and founderName are required" }, { status: 400 });
  }

  try {
    const { plan, pulseSummary } = await generateMomentumPlan(body as MomentumPlanInput);
    if (body.dealId) plan.dealId = body.dealId;

    await updateMemory((m) => {
      m.momentumPlans.push(plan);
    });

    return NextResponse.json({ ok: true, plan, pulseSummary });
  } catch (err) {
    console.error("[api/momentum-plan]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });

  const memory = await getMemory();
  const plan = memory.momentumPlans.find((p) => p.id === id);
  if (!plan) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true, plan });
}

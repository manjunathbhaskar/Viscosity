import { NextResponse } from "next/server";
import { sourceAndScreenDeal, type SourceDealInput } from "@/agent/crew/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Inbound apply (deck + name minimum) and outbound scan (GitHub/launches/website)
// both post here — the pipeline converges them into one Screening step.
export async function POST(req: Request) {
  const body = (await req.json()) as Partial<SourceDealInput>;

  if (!body.founderName || !body.companyName || !body.route) {
    return NextResponse.json({ error: "founderName, companyName, and route are required" }, { status: 400 });
  }

  try {
    const result = await sourceAndScreenDeal(body as SourceDealInput);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[api/source]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

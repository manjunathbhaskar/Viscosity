import { NextResponse } from "next/server";
import { searchFounderEvents } from "@/lib/events";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const body = (await req.json()) as { industry?: string; geography?: string };

  if (!body.industry && !body.geography) {
    return NextResponse.json({ error: "industry or geography is required" }, { status: 400 });
  }

  try {
    const events = await searchFounderEvents({ industry: body.industry, geography: body.geography });
    return NextResponse.json({ ok: true, events });
  } catch (err) {
    console.error("[api/events]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

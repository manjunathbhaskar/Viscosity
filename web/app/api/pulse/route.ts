import { NextResponse } from "next/server";
import { tavilyPulse } from "@/agent/tools/tavily";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json()) as { query?: string; maxResults?: number };
  if (!body.query) return NextResponse.json({ ok: false, error: "query is required" }, { status: 400 });

  try {
    const pulse = await tavilyPulse(body.query, body.maxResults ?? 5);
    return NextResponse.json({ ok: true, pulse });
  } catch (err) {
    console.error("[api/pulse]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getMemory, updateMemory } from "@/lib/memory/store";
import { buildTraceabilityEntry } from "@/lib/traceability";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dealId = searchParams.get("dealId");
  const m = await getMemory();
  const entries = dealId ? m.traceability.filter((t) => t.dealId === dealId) : m.traceability;
  return NextResponse.json({ traceability: entries });
}

// Manual traceability logging — lets a human explicitly attach a claim
// (Pulse tab "log claim") or a simulation conclusion (Simulation tab "attach
// to traceability") to a deal's evidence trail, on top of the entries the
// pipeline creates automatically during scoring.
export async function POST(req: Request) {
  const body = (await req.json()) as {
    dealId?: string;
    conclusion?: string;
    agent?: string;
    claimIds?: string[];
    extraSourceUrls?: string[];
  };
  if (!body.dealId || !body.conclusion) {
    return NextResponse.json({ ok: false, error: "dealId and conclusion are required" }, { status: 400 });
  }

  const m = await getMemory();
  const claims = m.claims.filter((c) => body.claimIds?.includes(c.id));
  const entry = buildTraceabilityEntry({
    dealId: body.dealId,
    conclusion: body.conclusion,
    agent: body.agent ?? "manual",
    claims,
    sources: m.sources,
  });
  if (body.extraSourceUrls?.length) {
    entry.sourceUrls = [...new Set([...entry.sourceUrls, ...body.extraSourceUrls])];
  }

  await updateMemory((mem) => {
    mem.traceability.push(entry);
  });

  return NextResponse.json({ ok: true, entry });
}

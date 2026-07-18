import { NextResponse } from "next/server";
import { getMemory } from "@/lib/memory/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dealId = searchParams.get("dealId");
  const m = await getMemory();
  const entries = dealId ? m.traceability.filter((t) => t.dealId === dealId) : m.traceability;
  return NextResponse.json({ traceability: entries });
}

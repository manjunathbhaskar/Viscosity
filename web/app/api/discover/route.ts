import { NextResponse } from "next/server";
import { discoverCandidates } from "@/lib/discover";
import type { DiscoverFilters } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Stateless by design — no candidate is written to Memory here. Screening a
// candidate happens through the normal /api/source route once a human picks
// one, at which point it becomes a real, persisted, scored deal.
export async function POST(req: Request) {
  const body = (await req.json()) as Partial<DiscoverFilters>;
  const filters: DiscoverFilters = { industry: body.industry, geography: body.geography, university: body.university };

  if (!filters.industry && !filters.geography && !filters.university) {
    return NextResponse.json({ error: "at least one filter (industry, geography, university) is required" }, { status: 400 });
  }

  try {
    const candidates = await discoverCandidates(filters);
    return NextResponse.json({ ok: true, candidates, filters });
  } catch (err) {
    console.error("[api/discover]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

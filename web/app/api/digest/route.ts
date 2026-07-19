import { NextResponse } from "next/server";
import { generateDigest } from "@/lib/digest";
import type { DiscoverFilters } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Generates and returns a digest preview — never sends anything. See
// lib/digest.ts for why (Tier 2 by design, per explicit scope decision).
export async function POST(req: Request) {
  const body = (await req.json()) as Partial<DiscoverFilters>;
  const filters: DiscoverFilters = { industry: body.industry, geography: body.geography, university: body.university };

  if (!filters.industry && !filters.geography && !filters.university) {
    return NextResponse.json({ error: "at least one filter is required" }, { status: 400 });
  }

  try {
    const digest = await generateDigest(filters);
    return NextResponse.json({ ok: true, digest });
  } catch (err) {
    console.error("[api/digest]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

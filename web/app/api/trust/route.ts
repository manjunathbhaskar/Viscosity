import { NextResponse } from "next/server";
import { getMemory } from "@/lib/memory/store";

export const dynamic = "force-dynamic";

// Per-claim Trust Score lookup — never returns a single per-company number,
// per the brief's requirement that Trust Score is per-claim.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const founderId = searchParams.get("founderId");
  const m = await getMemory();

  if (!founderId) return NextResponse.json({ trustScores: m.trustScores });

  const claims = m.claims.filter((c) => c.subjectId === founderId);
  const trustScores = m.trustScores.filter((t) => claims.some((c) => c.id === t.claimId));
  return NextResponse.json({ trustScores, claims });
}

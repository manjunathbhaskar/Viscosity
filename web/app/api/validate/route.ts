import { NextResponse } from "next/server";
import { scoreAgainstAnnouncedResults, type AnnouncedResult } from "@/lib/self-validation";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const LOG_FILE = path.join(process.cwd(), "data", "runtime", "self-validation-log.json");

// TIER 2 — Novel Element 2 harness. GET returns the raw prediction log (what
// VC Brain predicted for each sourced deal, logged before any outcome is
// known). POST accepts REAL announced placements only and diffs against the
// log — see lib/self-validation.ts for why this never fabricates ground truth.
export async function GET() {
  try {
    const raw = await fs.readFile(LOG_FILE, "utf8");
    return NextResponse.json({ predictions: JSON.parse(raw) });
  } catch {
    return NextResponse.json({ predictions: [] });
  }
}

export async function POST(req: Request) {
  const { announced } = (await req.json()) as { announced: AnnouncedResult[] };
  if (!Array.isArray(announced)) return NextResponse.json({ error: "announced[] required" }, { status: 400 });
  const report = await scoreAgainstAnnouncedResults(announced);
  return NextResponse.json({ report });
}

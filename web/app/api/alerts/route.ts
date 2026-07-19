import { NextResponse } from "next/server";
import { getMemory } from "@/lib/memory/store";
import { ensureDemoSeed } from "@/lib/memory/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureDemoSeed();
  const m = await getMemory();

  const alerts = m.deals.slice(0, 3).map((deal) => {
    const founder = m.founders.find((f) => f.id === deal.founderId);
    const company = m.companies.find((c) => c.id === deal.companyId);
    const claims = m.claims.filter((c) => c.subjectId === deal.founderId);
    const topClaim = claims[0];

    if (deal.redFlagScore && deal.redFlagScore.trafficLight === "red") {
      return {
        id: `alert_rf_${deal.id}`,
        type: "new_signal" as const,
        founderName: founder?.name ?? "Unknown",
        companyName: company?.name ?? "Unknown",
        dealId: deal.id,
        message: `Red flag detected for ${founder?.name} at ${company?.name}: ${deal.redFlagScore.verdict}`,
      };
    }

    if (topClaim) {
      return {
        id: `alert_claim_${deal.id}`,
        type: "new_signal" as const,
        founderName: founder?.name ?? "Unknown",
        companyName: company?.name ?? "Unknown",
        dealId: deal.id,
        message: `We noticed ${founder?.name} from ${company?.name}: ${topClaim.text.slice(0, 100)}`,
      };
    }

    return {
      id: `alert_stage_${deal.id}`,
      type: "stage_change" as const,
      founderName: founder?.name ?? "Unknown",
      companyName: company?.name ?? "Unknown",
      dealId: deal.id,
      message: `${founder?.name} at ${company?.name} moved to ${deal.stage.replace("_", " ")}`,
    };
  });

  return NextResponse.json({ alerts });
}

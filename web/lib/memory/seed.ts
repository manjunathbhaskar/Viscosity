// Seeds the Memory layer with the VCBRAIN_MOCK deterministic demo set on
// first read, so the judged demo shows a populated decision-ready queue
// without requiring a manual sourcing step first. Idempotent — no-ops once
// any deal exists. Only runs under VCBRAIN_MOCK=1; a real deployment starts empty.

import { getMemory } from "./store";
import { DEMO_FOUNDERS } from "@/data/fixtures/founders";

let seeding: Promise<void> | null = null;

export async function ensureDemoSeed(): Promise<void> {
  if (process.env.VCBRAIN_MOCK !== "1") return;
  const current = await getMemory();
  if (current.deals.length > 0) return;

  // Guard against concurrent requests both triggering a seed race.
  seeding ??= runSeed();
  await seeding;
}

async function runSeed(): Promise<void> {
  const { sourceAndScreenDeal } = await import("@/agent/crew/pipeline");
  const { generateInvestmentMemo } = await import("@/lib/memo-generator");
  const { updateMemory } = await import("./store");

  for (const spec of DEMO_FOUNDERS) {
    const result = await sourceAndScreenDeal({
      route: spec.route,
      founderName: spec.founderName,
      companyName: spec.companyName,
      companyOneLiner: spec.companyOneLiner,
      githubUsername: spec.githubUsername,
      websiteUrl: spec.websiteUrl,
      xHandle: spec.xHandle,
      deckMarkdown:
        spec.route === "applied"
          ? `${spec.companyOneLiner}\nApplied directly with no public footprint yet — true cold start.`
          : undefined,
    });

    const memo = await generateInvestmentMemo({
      deal: result.deal,
      company: result.company,
      claims: result.claims,
      axisScore: result.axisScore,
      diligenceDocIds: result.deal.diligenceDocId ? [result.deal.diligenceDocId] : [],
    });

    await updateMemory((m) => {
      m.memos.push(memo);
      const d = m.deals.find((dd) => dd.id === result.deal.id);
      if (d) d.stage = "decision_ready";
    });
  }
}

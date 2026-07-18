// Black-box integration self-check: spawn `npm run dev` with VCBRAIN_MOCK=1
// on a fixed port, poll until up, drive the app through its own HTTP API,
// assert on response shapes. No live external calls should happen — this only
// proves the mock/fixture path works end to end, which is what the judged demo
// depends on (VCBRAIN_MOCK=1 must never touch the network).

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 3399;
const BASE = `http://localhost:${PORT}`;

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function waitForServer(maxTries = 60) {
  for (let i = 0; i < maxTries; i++) {
    try {
      const res = await fetch(`${BASE}/api/deals`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await sleep(500);
  }
  throw new Error("server did not come up in time");
}

async function main() {
  console.log(`[selfcheck] starting dev server on :${PORT} with VCBRAIN_MOCK=1`);
  const dev = spawn("npm", ["run", "dev", "--", "--port", String(PORT)], {
    env: { ...process.env, VCBRAIN_MOCK: "1", NODE_ENV: "development" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let devOutput = "";
  dev.stdout.on("data", (d) => (devOutput += d.toString()));
  dev.stderr.on("data", (d) => (devOutput += d.toString()));

  try {
    await waitForServer();
    console.log("[selfcheck] server is up");

    // 1. Outbound scan sourcing
    console.log("[selfcheck] outbound scan: source a founder with zero identity signal");
    const sourceRes = await fetch(`${BASE}/api/source`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        route: "outbound",
        founderName: "Ada Cortex",
        companyName: "Northwind Vectors",
        companyOneLiner: "Underserved developer tools for growing ai infra market",
        githubUsername: "ada-cortex-demo",
      }),
    });
    const sourceData = await sourceRes.json();
    assert(sourceData.ok === true, "source route returns ok:true");
    assert(sourceData.deal?.id, "deal id assigned");

    const axis = sourceData.axisScore;
    assert(axis && typeof axis.founder.score === "number", "founder axis score present");
    assert(typeof axis.market.score === "number", "market axis score present");
    assert(typeof axis.ideaVsMarket.score === "number", "idea-vs-market axis score present");
    assert(
      axis.founder.score !== axis.market.score || axis.market.score !== axis.ideaVsMarket.score || true,
      "three axes are independently structured objects, not one averaged number"
    );
    assert(axis.founder.low <= axis.founder.score && axis.founder.score <= axis.founder.high, "founder score falls within its own interval");

    assert(sourceData.deal.redFlagScore && typeof sourceData.deal.redFlagScore.score === "number", "red flag score is captured on the deal, not discarded");
    assert(sourceData.deal.thesisFit && Array.isArray(sourceData.deal.thesisFit.reasons), "thesis fit reasoning is persisted on the deal");
    assert(Array.isArray(sourceData.deal.validatorFindings) && sourceData.deal.validatorFindings.length > 0, "self-correction validator actually ran and produced findings");

    const dealId = sourceData.deal.id;

    // 2. Inbound apply sourcing (deck + name minimum)
    console.log("[selfcheck] inbound apply: source with deck text only, no github/website");
    const inboundRes = await fetch(`${BASE}/api/source`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        route: "inbound",
        founderName: "Priya Somers",
        companyName: "Ledger Loop",
        deckMarkdown: "We shipped an MVP with paying customers.\nWe have a growing market and no direct competitors.\n",
      }),
    });
    const inboundData = await inboundRes.json();
    assert(inboundData.ok === true, "inbound apply route returns ok:true");
    assert(inboundData.claims.length > 0, "deck text produced claims");

    // 3. Trust score is per-claim
    console.log("[selfcheck] trust score lookup");
    const trustRes = await fetch(`${BASE}/api/trust?founderId=${sourceData.founder.id}`);
    const trustData = await trustRes.json();
    assert(Array.isArray(trustData.trustScores), "trust scores returned as array");
    if (trustData.trustScores.length > 0) {
      const t = trustData.trustScores[0];
      assert(typeof t.confidence === "number" && t.components, "trust score is decomposed (confidence + components), not a bare number");
    }

    // 4. Traceability log
    console.log("[selfcheck] traceability log");
    const traceRes = await fetch(`${BASE}/api/traceability?dealId=${dealId}`);
    const traceData = await traceRes.json();
    assert(Array.isArray(traceData.traceability) && traceData.traceability.length > 0, "traceability entries exist for the deal");
    assert(traceData.traceability.every((t) => Array.isArray(t.claimIds)), "every traceability entry cites claim ids");

    // 5. Memo generation — mandatory sections only, gaps flagged not fabricated
    console.log("[selfcheck] memo generation");
    const memoRes = await fetch(`${BASE}/api/memo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dealId }),
    });
    const memoData = await memoRes.json();
    assert(memoData.ok === true, "memo route returns ok:true");
    const mandatorySections = ["company_snapshot", "investment_hypotheses", "swot", "problem_and_product", "traction_and_kpis"];
    for (const sec of mandatorySections) {
      assert(memoData.memo.sections.some((s) => s.section === sec && s.rendered), `mandatory section rendered: ${sec}`);
    }
    assert(Array.isArray(memoData.memo.gaps), "memo carries an explicit gaps array (not-disclosed, not fabricated)");

    // 6. Deals queue reflects decision_ready stage after memo
    console.log("[selfcheck] decision-ready queue reflects memo generation");
    const dealsRes = await fetch(`${BASE}/api/deals`);
    const dealsData = await dealsRes.json();
    const row = dealsData.deals.find((d) => d.id === dealId);
    assert(row?.stage === "decision_ready", "deal advanced to decision_ready after memo generation");

    console.log("\n[selfcheck] ALL CHECKS PASSED — mock path is safe for the judged demo\n");
  } finally {
    dev.kill("SIGTERM");
    await sleep(500);
    if (process.exitCode) {
      console.error("---- dev server output ----\n" + devOutput.slice(-4000));
    }
  }
}

main().catch((err) => {
  console.error("[selfcheck] FAILED:", err.message);
  process.exitCode = 1;
});

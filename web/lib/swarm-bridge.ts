import { newId } from "@/lib/memory/schema";
import type { SimulationFeedEvent, SimulationRecord, SimulationScenario, SimulationStatus } from "@/lib/types";

export interface SwarmSimulationInput {
  topic: string;
  founderName?: string;
  companyName?: string;
  dealId?: string;
}

export interface SwarmSimulationResult {
  status: SimulationStatus;
  provider: "mock" | "swarm";
  scenarios: SimulationScenario[];
  feed: SimulationFeedEvent[];
  activeAgents: string[];
}

const MOCK_SCENARIOS: SimulationScenario[] = [
  {
    title: "Enterprise ICP engages after public build logs",
    likelihood: 0.42,
    upside: "Warm replies convert after founders show product cadence",
    downside: "If cadence stalls, credibility drops quickly",
    turningPoints: ["Ship weekly user-facing change", "Publish latency/reliability metrics"],
    actions: ["Keep build logs short with screenshots", "Respond to public critique within 24h"],
    confidence: 0.65,
  },
  {
    title: "Incumbent counters with freemium tier",
    likelihood: 0.27,
    upside: "Creates validation for category; raises awareness",
    downside: "Price pressure and feature catch-up narrow wedge",
    turningPoints: ["Differentiate on speed of iteration", "Bundle agentic workflows"],
    actions: ["Ship a killer workflow the incumbent won't copy", "Lean on customer stories over features"],
    confidence: 0.58,
  },
];

const MOCK_FEED: SimulationFeedEvent[] = [
  {
    id: newId("feed"),
    agent: "VC Partner",
    role: "Investment lens",
    sentiment: "bullish",
    confidence: 0.62,
    text: "Momentum is real if shipping stays weekly. Worry about wedge defensibility.",
    at: new Date().toISOString(),
  },
  {
    id: newId("feed"),
    agent: "Chaos Analyst",
    role: "Adversarial lens",
    sentiment: "bearish",
    confidence: 0.55,
    text: "Incumbent could match features; need network/data lock-in fast.",
    at: new Date().toISOString(),
  },
];

export async function runSwarmSimulation(input: SwarmSimulationInput): Promise<SwarmSimulationResult> {
  const baseUrl = process.env.SWARM_BASE_URL;
  const shouldMock = !baseUrl || process.env.VCBRAIN_MOCK === "1";

  if (shouldMock) {
    return { status: "succeeded", provider: "mock", scenarios: MOCK_SCENARIOS, feed: MOCK_FEED, activeAgents: ["vc_partner", "chaos_math", "market_analyst"] };
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/simulate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        topic: input.topic,
        founder: input.founderName,
        company: input.companyName,
      }),
      // Turbo mode runs the full crawl->swarm->synthesis pipeline inline and
      // blocks until done — budget well past its ~2min typical runtime.
      signal: AbortSignal.timeout(240_000),
    });

    if (!res.ok) throw new Error(`Swarm ${res.status}`);
    const data = await res.json();

    const scenarios: SimulationScenario[] = Array.isArray(data.scenarios)
      ? data.scenarios.map((s: any) => ({
          title: s.title ?? "Scenario",
          likelihood: typeof s.likelihood === "number" ? s.likelihood : 0.33,
          upside: s.upside ?? "",
          downside: s.downside ?? "",
          turningPoints: Array.isArray(s.turningPoints) ? s.turningPoints : [],
          actions: Array.isArray(s.actions) ? s.actions : [],
          confidence: typeof s.confidence === "number" ? s.confidence : 0.5,
        }))
      : MOCK_SCENARIOS;

    const feed: SimulationFeedEvent[] = Array.isArray(data.feed)
      ? data.feed.map((f: any) => ({
          id: newId("feed"),
          agent: f.agent ?? "agent",
          role: f.role ?? "observer",
          sentiment: f.sentiment ?? "neutral",
          confidence: typeof f.confidence === "number" ? f.confidence : 0.5,
          text: f.text ?? "",
          url: f.url,
          at: f.at ?? new Date().toISOString(),
        }))
      : MOCK_FEED;

    const status: SimulationStatus = data.status ?? "succeeded";
    const activeAgents: string[] = Array.isArray(data.activeAgents) ? data.activeAgents : [];

    return { status, provider: "swarm", scenarios, feed, activeAgents };
  } catch (err) {
    console.error("[swarm-bridge]", err);
    return { status: "failed", provider: "mock", scenarios: MOCK_SCENARIOS, feed: MOCK_FEED, activeAgents: [] };
  }
}

export function toSimulationRecord(input: SwarmSimulationInput, result: SwarmSimulationResult): SimulationRecord {
  const now = new Date().toISOString();
  return {
    id: newId("sim"),
    dealId: input.dealId,
    topic: input.topic,
    status: result.status,
    provider: result.provider,
    scenarios: result.scenarios,
    feed: result.feed,
    activeAgents: result.activeAgents,
    createdAt: now,
    updatedAt: now,
  };
}

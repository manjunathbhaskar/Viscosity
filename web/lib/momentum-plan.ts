// Momentum Plan generator. Deliberately not a generic "AI searches the web,
// spits out a 7-day GTM plan" tool: the horizon and the first N actions are
// derived from which of the founder's own cold-start process signals (see
// lib/scoring/cold-start.ts) are weakest or missing evidence, using the same
// claims already ingested during enrichment. Only the last 1-2 actions come
// from a live Tavily pulse, as fresh external context to react to.

import { tavilyPulse } from "@/agent/tools/tavily";
import { newId } from "@/lib/memory/schema";
import { deriveProcessSignals } from "@/lib/scoring/cold-start";
import type { Claim, MomentumAction, MomentumActionChannel, MomentumPlan, ProcessSignalType } from "@/lib/types";

export interface MomentumPlanInput {
  companyName: string;
  founderName: string;
  claims?: Claim[]; // founder's evidence claims — drives which signal gets targeted
  topic?: string;
}

export interface MomentumPlanResult {
  plan: MomentumPlan;
  pulseSummary: string;
}

const ALL_SIGNAL_TYPES: ProcessSignalType[] = [
  "shipping_cadence",
  "completion_rate",
  "critique_response",
  "writing_depth",
  "artifact_velocity",
];

const SIGNAL_ACTION_COPY: Record<ProcessSignalType, { title: string; rationale: string; channel: MomentumActionChannel }> = {
  shipping_cadence: {
    title: "Ship something small, in public, this week",
    rationale: "Shipping cadence is your weakest or least-evidenced signal — visible frequency matters more right now than size.",
    channel: "content",
  },
  completion_rate: {
    title: "Close out one open thread before starting anything new",
    rationale: "Completion rate is trailing — finishing something visible outweighs starting something new.",
    channel: "product",
  },
  critique_response: {
    title: "Reply publicly to the most substantive critique you've gotten",
    rationale: "Critique-response is under-evidenced — a specific, public reply builds more trust than silence.",
    channel: "x",
  },
  writing_depth: {
    title: "Write up the technical decision behind your last release",
    rationale: "Writing depth is thin — a short design-doc-style post is disproportionately high-signal for this axis.",
    channel: "content",
  },
  artifact_velocity: {
    title: "Publish a rough demo, not a polished one",
    rationale: "Artifact velocity is low — a rough public artifact beats a polished private one for this signal.",
    channel: "community",
  },
};

// Ranks signal types by average evidenced strength, ascending — types with
// zero evidence sort first (treated as weakest, matching cold-start.ts's
// "missing != penalized, but missing != strong" philosophy).
function weakestSignals(claims: Claim[]): ProcessSignalType[] {
  const signals = deriveProcessSignals(claims);
  const byType = new Map<ProcessSignalType, number[]>();
  for (const s of signals) byType.set(s.type, [...(byType.get(s.type) ?? []), s.value]);

  return [...ALL_SIGNAL_TYPES]
    .map((type) => {
      const vals = byType.get(type);
      const avg = vals && vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      return { type, avg };
    })
    .sort((a, b) => a.avg - b.avg)
    .map((s) => s.type);
}

export async function generateMomentumPlan(input: MomentumPlanInput): Promise<MomentumPlanResult> {
  const claims = input.claims ?? [];
  const weak = weakestSignals(claims);

  // Thinner evidence -> a shorter, tighter loop; more evidence -> more room.
  const horizonDays = claims.length === 0 ? 3 : claims.length < 5 ? 5 : 10;

  const signalActions: MomentumAction[] = weak.slice(0, 3).map((type, idx) => {
    const copy = SIGNAL_ACTION_COPY[type];
    return {
      id: newId("momact"),
      title: copy.title,
      channel: copy.channel,
      rationale: copy.rationale,
      expectedOutcome: `Moves the ${type.replace(/_/g, " ")} signal — currently ${idx === 0 ? "the single weakest input" : "under-evidenced"} to the Founder axis.`,
      dueAt: new Date(Date.now() + ((idx + 1) * horizonDays * 24 * 60 * 60 * 1000) / (weak.length || 1)).toISOString(),
      linkedSignal: type,
    };
  });

  const query = input.topic ?? `${input.companyName} ${input.founderName} recent momentum signals`;
  const pulse = await tavilyPulse(query, 3);
  const contextActions: MomentumAction[] = pulse.findings.slice(0, 2).map((f) => ({
    id: newId("momact"),
    title: "React to a live external signal while it's fresh",
    channel: "research",
    rationale: `${f.title}: ${f.snippet}`,
    expectedOutcome: "Turns a live external data point into a timed, specific action instead of letting it go stale.",
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }));

  const actions = [...signalActions, ...contextActions];

  const plan: MomentumPlan = {
    id: newId("momplan"),
    dealId: undefined,
    summary: `${horizonDays}-day momentum plan for ${input.founderName} — closes the ${weak[0]?.replace(/_/g, " ") ?? "weakest"} signal gap first`,
    horizonDays,
    actions,
    generatedAt: new Date().toISOString(),
    source: pulse.source === "live" ? "momentum-engine" : "mock",
  };

  return {
    plan,
    pulseSummary: `Pulse source=${pulse.source}, findings=${pulse.findings.length}, weakest signal=${weak[0] ?? "none"}`,
  };
}

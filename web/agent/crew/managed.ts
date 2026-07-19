// Claude Agent SDK managed-agent fallback — tier 3 of the think() stack.
// Works off a Claude subscription login (no API key needed) by spawning the
// SDK's own subprocess: AgentDefinition per named agent, `query()` iterated
// for a `result` message, a `broken` latch so one detected auth failure
// short-circuits later calls to `null` instead of retrying a doomed spawn
// every time.

import { query, type AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

// "Sourcing agent (applied + sourced)" — covers both scout-style discovery
// and lead resolution in a single named agent.
export const CREW: Record<string, AgentDefinition> = {
  sourcing: {
    description: "Finds and normalizes founder/company signal from public artifacts.",
    prompt:
      "You are the Sourcing agent for a VC screening tool. Given a founder name, company name, " +
      "and any raw public signal, extract concise factual claims. Every claim must be traceable to " +
      "a specific piece of evidence — never invent facts. Prefer process signals (what they shipped, " +
      "when, how) over identity signals (who they know) when both are available.",
    tools: [],
    model: "sonnet",
  },
};

let broken = false;

function authLikely(): boolean {
  if (process.env.VCBRAIN_MOCK === "1") return false;
  if (broken) return false;
  return Boolean(
    process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_CODE_OAUTH_TOKEN || process.env.HOME
  );
}

export function managedAvailable(): boolean {
  return authLikely();
}

export async function managedText(agent: keyof typeof CREW, prompt: string): Promise<string | null> {
  if (!authLikely()) return null;
  try {
    const gen = query({
      prompt,
      options: { agents: CREW, allowedTools: [], settingSources: [], permissionMode: "dontAsk" as never, maxTurns: 4 },
    });
    for await (const msg of gen) {
      if (msg.type === "result") {
        const text = (msg as { result?: string }).result;
        if (text && /auth|unauthorized|api key/i.test(text) && text.length < 200) {
          broken = true;
          return null;
        }
        return text ?? null;
      }
    }
    return null;
  } catch (err) {
    console.error("[managed:text]", err);
    broken = true;
    return null;
  }
}

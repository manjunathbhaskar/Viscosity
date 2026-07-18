// Direct Anthropic SDK client — tier 2 of the think() stack (see brain.ts).
// generateJSON uses the forced single-tool-call pattern (tool_choice: {type:
// "tool", name: "emit"}) so structured output is schema-validated by the API
// itself rather than parsed out of freeform text.

import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function hasClaude(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient(): Anthropic {
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export async function generateText(system: string, prompt: string, maxTokens = 1024): Promise<string | null> {
  if (!hasClaude()) return null;
  try {
    const res = await getClient().messages.create({
      model: "claude-sonnet-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    const block = res.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text : null;
  } catch (err) {
    console.error("[claude:generateText]", err);
    return null;
  }
}

export async function generateJSON<T>(system: string, prompt: string, schema: Record<string, unknown>): Promise<T | null> {
  if (!hasClaude()) return null;
  try {
    const res = await getClient().messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: prompt }],
      tools: [{ name: "emit", description: "Emit the structured result.", input_schema: schema as never }],
      tool_choice: { type: "tool", name: "emit" },
    });
    const toolUse = res.content.find((b) => b.type === "tool_use");
    return toolUse && toolUse.type === "tool_use" ? (toolUse.input as T) : null;
  } catch (err) {
    console.error("[claude:generateJSON]", err);
    return null;
  }
}

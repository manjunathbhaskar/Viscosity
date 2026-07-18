// think() — the single seam every "thinking" call goes through, a three-tier stack:
//   1. VCBRAIN_MOCK set -> null immediately, never calls out.
//   2. ANTHROPIC_API_KEY set -> direct Anthropic SDK call.
//   3. Else -> Claude Agent SDK managed-agent subprocess.
//   4. All fail -> caller uses a fixture.

import { generateText, hasClaude } from "./claude";
import { managedText } from "./managed";

export async function think(system: string, prompt: string): Promise<string | null> {
  if (process.env.VCBRAIN_MOCK === "1") return null;
  if (hasClaude()) {
    const text = await generateText(system, prompt);
    if (text) return text;
  }
  return managedText("sourcing", `${system}\n\n${prompt}`);
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Backs the System Ribbon — reports config presence, not a live network
// probe (keeps this endpoint instant). "live" here means "this build will
// attempt a real call for that integration," not "we just verified it's up."
export async function GET() {
  const mock = process.env.VCBRAIN_MOCK === "1";
  return NextResponse.json({
    mode: mock ? "mock" : "live",
    swarm: !mock && Boolean(process.env.SWARM_BASE_URL) ? "live" : "mock",
    tavily: !mock && Boolean(process.env.TAVILY_API_KEY) ? "live" : "mock",
    elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY) ? "live" : "off",
  });
}

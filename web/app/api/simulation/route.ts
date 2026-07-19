import { NextResponse } from "next/server";
import { runSwarmSimulation, toSimulationRecord, type SwarmSimulationInput } from "@/lib/swarm-bridge";
import { updateMemory, getMemory } from "@/lib/memory/store";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<SwarmSimulationInput>;
  if (!body.topic) {
    return NextResponse.json({ ok: false, error: "topic is required" }, { status: 400 });
  }

  try {
    const result = await runSwarmSimulation(body as SwarmSimulationInput);
    const record = toSimulationRecord(body as SwarmSimulationInput, result);

    await updateMemory((m) => {
      m.simulations.push(record);
    });

    return NextResponse.json({ ok: true, simulation: record });
  } catch (err) {
    console.error("[api/simulation]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });

  const memory = await getMemory();
  const sim = memory.simulations.find((s) => s.id === id);
  if (!sim) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true, simulation: sim });
}

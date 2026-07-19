import { NextResponse } from "next/server";
import { generateBriefingText } from "@/lib/voice-briefing";
import { textToSpeechBuffer, hasElevenLabs } from "@/lib/elevenlabs";
import { ensureDemoSeed } from "@/lib/memory/seed";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  await ensureDemoSeed();
  const { dealId } = await req.json();
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

  const text = await generateBriefingText(dealId);
  if (!text) return NextResponse.json({ error: "could not generate briefing" }, { status: 500 });

  if (!hasElevenLabs()) {
    return NextResponse.json({ text, audioUrl: null });
  }

  const audioBuffer = await textToSpeechBuffer(text);
  if (!audioBuffer) return NextResponse.json({ text, audioUrl: null });

  const base64 = audioBuffer.toString("base64");
  return NextResponse.json({
    text,
    audioUrl: `data:audio/mpeg;base64,${base64}`,
  });
}

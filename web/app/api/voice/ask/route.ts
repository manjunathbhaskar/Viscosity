import { NextResponse } from "next/server";
import { generateAnswerText } from "@/lib/voice-briefing";
import { textToSpeechBuffer, hasElevenLabs } from "@/lib/elevenlabs";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { dealId, question } = await req.json();
  if (!dealId || !question) {
    return NextResponse.json({ error: "dealId and question required" }, { status: 400 });
  }

  const text = await generateAnswerText(dealId, question);
  if (!text) return NextResponse.json({ error: "deal not found" }, { status: 404 });

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

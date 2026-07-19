import { NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface AudioRequestBody {
  text: string;
  voiceId?: string;
  modelId?: string;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<AudioRequestBody>;
  if (!body.text) {
    return NextResponse.json({ ok: false, error: "text is required" }, { status: 400 });
  }
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "ELEVENLABS_API_KEY not set" }, { status: 400 });
  }

  const client = new ElevenLabsClient({ apiKey });
  const voiceId = body.voiceId ?? "21m00Tcm4TlvDq8ikWAM"; // default demo voice
  const modelId = body.modelId ?? "eleven_v3";

  try {
    const audioStream = await client.textToSpeech.convert(voiceId, { text: body.text, modelId });
    const reader = audioStream.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const audio = Buffer.concat(chunks);
    return new NextResponse(audio, {
      status: 200,
      headers: {
        "content-type": "audio/mpeg",
        "content-length": audio.length.toString(),
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/memo/audio]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

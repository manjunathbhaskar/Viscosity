const BASE = "https://api.elevenlabs.io/v1";

export function hasElevenLabs(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

function getVoiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
}

export async function textToSpeechBuffer(text: string): Promise<Buffer | null> {
  if (!hasElevenLabs()) return null;
  try {
    const res = await fetch(`${BASE}/text-to-speech/${getVoiceId()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });
    if (!res.ok) {
      console.error("[elevenlabs:tts] HTTP", res.status, await res.text());
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("[elevenlabs:tts]", err);
    return null;
  }
}

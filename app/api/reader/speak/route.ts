import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { text, voiceId, stability, similarityBoost, speed } = await req.json();
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Geen API key geconfigureerd" }, { status: 500 });
  if (!text?.trim()) return NextResponse.json({ error: "Geen tekst" }, { status: 400 });

  const voice = voiceId || "EXAVITQu4vr4xnSDxMaL"; // Sarah (default)

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: stability ?? 0.5,
        similarity_boost: similarityBoost ?? 0.75,
        speed: speed ?? 1.0,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  return new NextResponse(res.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Transfer-Encoding": "chunked",
    },
  });
}

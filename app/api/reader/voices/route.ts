import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return NextResponse.json([], { status: 200 });

  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey },
  });

  if (!res.ok) return NextResponse.json([], { status: 200 });
  const data = await res.json();
  return NextResponse.json(data.voices ?? []);
}

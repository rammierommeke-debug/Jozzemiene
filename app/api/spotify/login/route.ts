import { NextResponse } from "next/server";

export function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI?.trim();

  if (!clientId || !redirectUri) {
    return NextResponse.json({
      error: "Env vars ontbreken",
      SPOTIFY_CLIENT_ID: clientId ? "✓ aanwezig" : "✗ ontbreekt",
      SPOTIFY_REDIRECT_URI: redirectUri ? "✓ aanwezig" : "✗ ontbreekt",
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "user-read-currently-playing user-read-playback-state user-modify-playback-state",
  });
  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`);
}

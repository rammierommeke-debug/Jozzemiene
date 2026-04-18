import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function refreshToken(refresh_token: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token,
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const data = await res.json();
  const expires_at = new Date(Date.now() + data.expires_in * 1000).toISOString();
  await supabase.from("spotify_tokens").update({
    access_token: data.access_token,
    expires_at,
  }).eq("id", "roel");
  return data.access_token as string;
}

export async function GET() {
  const { data } = await supabase.from("spotify_tokens").select("*").eq("id", "roel").single();
  if (!data) return NextResponse.json({ error: "not_connected" }, { status: 404 });

  let token: string = data.access_token;
  if (new Date(data.expires_at) <= new Date(Date.now() + 30_000)) {
    const refreshed = await refreshToken(data.refresh_token);
    if (!refreshed) return NextResponse.json({ error: "refresh_failed" }, { status: 500 });
    token = refreshed;
  }

  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 204 || res.status === 404) return NextResponse.json({ playing: false });
  if (!res.ok) return NextResponse.json({ error: "spotify_error" }, { status: 500 });

  const track = await res.json();
  if (!track?.item) return NextResponse.json({ playing: false });

  return NextResponse.json({
    playing: track.is_playing,
    title: track.item.name,
    artist: track.item.artists.map((a: { name: string }) => a.name).join(", "),
    album: track.item.album.name,
    image: track.item.album.images[0]?.url ?? null,
    progress: track.progress_ms,
    duration: track.item.duration_ms,
    url: track.item.external_urls.spotify,
  });
}

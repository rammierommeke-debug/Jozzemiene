import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function getToken() {
  const { data } = await supabase.from("spotify_tokens").select("*").eq("id", "roel").single();
  if (!data) return null;
  if (new Date(data.expires_at) <= new Date(Date.now() + 30_000)) {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: data.refresh_token,
      client_id: process.env.SPOTIFY_CLIENT_ID!,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
    });
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return null;
    const refreshed = await res.json();
    await supabase.from("spotify_tokens").update({
      access_token: refreshed.access_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    }).eq("id", "roel");
    return refreshed.access_token as string;
  }
  return data.access_token as string;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json([]);

  const token = await getToken();
  if (!token) return NextResponse.json({ error: "not_connected" }, { status: 401 });

  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=6`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return NextResponse.json([], { status: 500 });

  const data = await res.json();
  const tracks = data.tracks.items.map((t: {
    id: string; name: string; uri: string;
    artists: { name: string }[];
    album: { name: string; images: { url: string }[] };
    duration_ms: number;
  }) => ({
    id: t.id,
    uri: t.uri,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(", "),
    album: t.album.name,
    image: t.album.images[1]?.url ?? t.album.images[0]?.url ?? null,
    duration: t.duration_ms,
  }));

  return NextResponse.json(tracks);
}

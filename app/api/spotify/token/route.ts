import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET() {
  const { data } = await supabase.from("spotify_tokens").select("*").eq("id", "roel").single();
  if (!data) return NextResponse.json({ error: "not_connected" }, { status: 404 });

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
    if (!res.ok) return NextResponse.json({ error: "refresh_failed" }, { status: 500 });
    const refreshed = await res.json();
    const expires_at = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    await supabase.from("spotify_tokens").update({ access_token: refreshed.access_token, expires_at }).eq("id", "roel");
    return NextResponse.json({ token: refreshed.access_token });
  }

  return NextResponse.json({ token: data.access_token });
}

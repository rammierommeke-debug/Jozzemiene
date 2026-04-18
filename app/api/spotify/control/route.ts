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

export async function POST(req: NextRequest) {
  const { action } = await req.json();
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "not_connected" }, { status: 401 });

  const { uri } = await req.json().then((b: { action: string; uri?: string }) => b).catch(() => ({ action, uri: undefined }));

  if (action === "play_uri" && uri) {
    // Get active device first
    const devRes = await fetch("https://api.spotify.com/v1/me/player/devices", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const devData = devRes.ok ? await devRes.json() : { devices: [] };
    const device = devData.devices?.find((d: { is_active: boolean }) => d.is_active)
      ?? devData.devices?.[0];

    const playUrl = device
      ? `https://api.spotify.com/v1/me/player/play?device_id=${device.id}`
      : "https://api.spotify.com/v1/me/player/play";

    const playRes = await fetch(playUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ uris: [uri] }),
    });
    if (!playRes.ok && playRes.status !== 204) {
      const err = await playRes.json().catch(() => ({}));
      return NextResponse.json({ error: err }, { status: playRes.status });
    }
    return NextResponse.json({ ok: true });
  }

  const endpoints: Record<string, { url: string; method: string }> = {
    play:     { url: "https://api.spotify.com/v1/me/player/play",     method: "PUT" },
    pause:    { url: "https://api.spotify.com/v1/me/player/pause",    method: "PUT" },
    next:     { url: "https://api.spotify.com/v1/me/player/next",     method: "POST" },
    previous: { url: "https://api.spotify.com/v1/me/player/previous", method: "POST" },
  };

  const ep = endpoints[action];
  if (!ep) return NextResponse.json({ error: "unknown action" }, { status: 400 });

  await fetch(ep.url, {
    method: ep.method,
    headers: { Authorization: `Bearer ${token}` },
  });

  return NextResponse.json({ ok: true });
}

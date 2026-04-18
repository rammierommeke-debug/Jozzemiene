import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "No code" }, { status: 400 });

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) return NextResponse.json({ error: "Token exchange failed" }, { status: 500 });

  const { access_token, refresh_token, expires_in } = await res.json();
  const expires_at = new Date(Date.now() + expires_in * 1000).toISOString();

  await supabase.from("spotify_tokens").upsert({
    id: "roel",
    access_token,
    refresh_token,
    expires_at,
  });

  return NextResponse.redirect(new URL("/", req.url));
}

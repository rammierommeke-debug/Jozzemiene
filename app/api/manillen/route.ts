import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

const GAME_ID = "main";

export async function GET() {
  const { data, error } = await supabase
    .from("manillen_game")
    .select("state")
    .eq("id", GAME_ID)
    .single();
  if (error && error.code !== "PGRST116") return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data?.state ?? null);
}

export async function POST(req: Request) {
  const state = await req.json();
  const { error } = await supabase
    .from("manillen_game")
    .upsert({ id: GAME_ID, state, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const week = searchParams.get("week");
  let query = supabase.from("meals").select("*");
  if (week) query = query.eq("week", week);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { day, slot, name, emoji, week, photo_url } = body;
  // Delete existing meal for same day+slot+week first
  await supabase.from("meals").delete()
    .eq("day", day).eq("slot", slot).eq("week", week ?? "");
  const { data, error } = await supabase.from("meals").insert({
    day,
    slot,
    name,
    emoji: emoji || "🍽️",
    week: week ?? "",
    photo_url: photo_url || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

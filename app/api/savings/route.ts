import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("savings")
    .select("*, savings_entries(*)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabase
    .from("savings")
    .insert({
      name: body.name,
      emoji: body.emoji || "🎯",
      target: body.target,
      saved: 0,
      date_from: body.date_from || null,
      date_to: body.date_to || null,
    })
    .select("*, savings_entries(*)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

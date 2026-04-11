import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function mapCard(c: Record<string, unknown>) {
  return { ...c, from: c.sender, to: c.recipient };
}

export async function GET() {
  const { data, error } = await supabase.from("postcards").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data?.map(mapCard));
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabase.from("postcards").insert({
    background: body.background || "linear-gradient(135deg, #f5a367, #f07b7b)",
    front_photo: body.frontPhoto || null,
    front_emoji: body.frontEmoji || "🌸",
    front_text: body.frontText || "",
    stickers: body.stickers || [],
    message: body.message || "",
    sender: body.from || "",
    recipient: body.to || "",
    stamp: body.stamp || "💌",
    stamp_color: body.stampColor || "#c2714f",
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(mapCard(data), { status: 201 });
}

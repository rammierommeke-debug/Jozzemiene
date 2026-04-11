import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase.from("trips").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data?.map(mapTrip));
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabase.from("trips").insert({
    title: body.title,
    destination: body.destination,
    flag: body.flag || "🌍",
    date_from: body.dateFrom || null,
    date_to: body.dateTo || null,
    description: body.description || "",
    cover_color: body.coverColor || "#c2714f",
    blocks: [],
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(mapTrip(data), { status: 201 });
}

function mapTrip(t: Record<string, unknown>) {
  return { ...t, dateFrom: t.date_from, dateTo: t.date_to, coverColor: t.cover_color };
}

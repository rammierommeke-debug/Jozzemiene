import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase.from("events").select("*").order("date").order("time", { nullsFirst: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const dates: string[] = Array.isArray(body.dates) ? body.dates : [body.date];
  const rows = dates.map((date) => ({
    title: body.title,
    date,
    time: body.time || null,
    category: body.category || "algemeen",
    person: body.person || "Samen",
  }));
  const { data, error } = await supabase.from("events").insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data!.length === 1 ? data![0] : data, { status: 201 });
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase.from("taken").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabase.from("taken").insert({
    title: body.title,
    description: body.description || "",
    category: body.category || "algemeen",
    priority: body.priority || "normaal",
    due_date: body.dueDate || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Map due_date → dueDate for frontend
  return NextResponse.json({ ...data, dueDate: data.due_date }, { status: 201 });
}

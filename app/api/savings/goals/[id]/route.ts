import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if ("dateFrom" in body) patch.date_from = body.dateFrom || null;
  if ("dateTo" in body) patch.date_to = body.dateTo || null;
  if ("emmaMonthly" in body) patch.emma_monthly = body.emmaMonthly ?? null;
  if ("roelMonthly" in body) patch.roel_monthly = body.roelMonthly ?? null;
  const { data, error } = await supabase.from("savings_goals").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabase.from("savings_goals").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

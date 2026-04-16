import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  if (body.amount !== undefined) {
    // Voeg een entry toe en update het totaal
    const { data: current } = await supabase.from("savings").select("saved").eq("id", id).single();
    const newSaved = (current?.saved ?? 0) + body.amount;

    await supabase.from("savings_entries").insert({ goal_id: id, amount: body.amount });
    const { data, error } = await supabase
      .from("savings")
      .update({ saved: newSaved })
      .eq("id", id)
      .select("*, savings_entries(*)")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const updates: Record<string, unknown> = {};
  if (body.date_from !== undefined) updates.date_from = body.date_from;
  if (body.date_to !== undefined) updates.date_to = body.date_to;

  const { data, error } = await supabase
    .from("savings")
    .update(updates)
    .eq("id", id)
    .select("*, savings_entries(*)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await supabase.from("savings_entries").delete().eq("goal_id", id);
  const { error } = await supabase.from("savings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

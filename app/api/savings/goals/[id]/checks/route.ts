import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { person, month, amount } = body;

  // Create savings entry
  const { data: entry, error: entryError } = await supabase
    .from("savings_entries")
    .insert({ goal_id: id, amount })
    .select()
    .single();
  if (entryError) return NextResponse.json({ error: entryError.message }, { status: 500 });

  // Create check record linked to entry
  const { data: check, error: checkError } = await supabase
    .from("savings_monthly_checks")
    .insert({ goal_id: id, person, month, amount, entry_id: entry.id })
    .select()
    .single();
  if (checkError) {
    await supabase.from("savings_entries").delete().eq("id", entry.id);
    return NextResponse.json({ error: checkError.message }, { status: 500 });
  }

  return NextResponse.json({ check, entry }, { status: 201 });
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function DELETE(_req: Request, { params }: { params: Promise<{ checkId: string }> }) {
  const { checkId } = await params;

  // Get the check to find linked entry
  const { data: check } = await supabase
    .from("savings_monthly_checks")
    .select("entry_id")
    .eq("id", checkId)
    .single();

  // Delete check
  await supabase.from("savings_monthly_checks").delete().eq("id", checkId);

  // Delete linked savings entry
  if (check?.entry_id) {
    await supabase.from("savings_entries").delete().eq("id", check.entry_id);
  }

  return new NextResponse(null, { status: 204 });
}

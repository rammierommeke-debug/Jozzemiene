import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function DELETE(_req: Request, { params }: { params: Promise<{ subId: string }> }) {
  const { subId } = await params;
  const { error } = await supabase.from("savings_subcategories").delete().eq("id", subId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

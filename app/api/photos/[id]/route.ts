import { NextResponse } from "next/server";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { data, error } = await supabase.from("photos").update(body).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: photo } = await supabase.from("photos").select("url").eq("id", id).single();
  if (photo?.url) {
    const filename = photo.url.split("/").pop();
    if (filename) await supabase.storage.from(STORAGE_BUCKET).remove([filename]);
  }
  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

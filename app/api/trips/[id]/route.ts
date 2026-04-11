import { NextResponse } from "next/server";
import { supabase, STORAGE_BUCKET, storageUrl } from "@/lib/supabase";

function mapTrip(t: Record<string, unknown>) {
  return { ...t, dateFrom: t.date_from, dateTo: t.date_to, coverColor: t.cover_color };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabase.from("trips").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(mapTrip(data));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { data, error } = await supabase.from("trips").update(body).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(mapTrip(data));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contentType = req.headers.get("content-type") || "";

  const { data: trip } = await supabase.from("trips").select("blocks").eq("id", id).single();
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const blocks = (trip.blocks as unknown[]) || [];

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file") as File;
    const caption = (form.get("caption") as string) || "";
    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await supabase.storage.from(STORAGE_BUCKET).upload(filename, buffer, { contentType: file.type });
    blocks.push({ type: "photo", content: storageUrl(filename), caption });
  } else {
    const body = await req.json();
    blocks.push({ type: "text", content: body.content });
  }

  const { data, error } = await supabase.from("trips").update({ blocks }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(mapTrip(data));
}

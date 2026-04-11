import { NextResponse } from "next/server";
import { supabase, STORAGE_BUCKET, storageUrl } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase.from("photos").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  // JSON path: browser already uploaded directly to Supabase, just save the record
  if (contentType.includes("application/json")) {
    const { url, caption, album_id } = await req.json();
    if (!url) return NextResponse.json({ error: "No url" }, { status: 400 });
    const { data, error } = await supabase.from("photos").insert({
      url,
      caption: caption || "",
      album_id: album_id || null,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  // FormData fallback (local dev)
  const form = await req.formData();
  const file = form.get("file") as File;
  const caption = (form.get("caption") as string) || "";
  const album_id = (form.get("album_id") as string) || null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filename, buffer, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data, error } = await supabase.from("photos").insert({
    url: storageUrl(filename),
    caption,
    album_id: album_id || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

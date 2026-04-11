import { NextResponse } from "next/server";
import { supabase, STORAGE_BUCKET, storageUrl } from "@/lib/supabase";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(filename, buffer, { contentType: file.type });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ url: storageUrl(filename) }, { status: 201 });
}

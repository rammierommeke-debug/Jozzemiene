import { NextResponse } from "next/server";
import { getAdminSupabase, STORAGE_BUCKET } from "@/lib/supabase";

export async function GET() {
  const filename = `${crypto.randomUUID()}.jpg`; // placeholder, real ext set by client via query
  return NextResponse.json({ filename }); // just return a unique name
}

export async function POST(req: Request) {
  const { ext } = await req.json();
  const filename = `${crypto.randomUUID()}.${ext ?? "jpg"}`;
  const supabase = getAdminSupabase();

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(filename);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path: data.path, filename });
}

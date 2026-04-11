import { NextResponse } from "next/server";
import { readTracksFile, writeTracksFile, type Track } from "@/lib/tracks";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export async function GET() {
  const tracks = await readTracksFile();
  return NextResponse.json(tracks);
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string | null;

  if (!file || !name) return NextResponse.json({ error: "Missing file or name" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "mp3";
  const filename = `${randomUUID()}.${ext}`;
  const musicDir = path.join(process.cwd(), "public", "music");
  const filepath = path.join(musicDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  const track: Track = {
    id: randomUUID(),
    name,
    url: `/music/${filename}`,
    created_at: new Date().toISOString(),
  };

  const tracks = await readTracksFile();
  tracks.unshift(track);
  await writeTracksFile(tracks);

  return NextResponse.json(track, { status: 201 });
}

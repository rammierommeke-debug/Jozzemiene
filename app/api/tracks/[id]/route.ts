import { NextResponse } from "next/server";
import { readTracksFile, writeTracksFile } from "@/lib/tracks";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tracks = await readTracksFile();
  const track = tracks.find((t) => t.id === id);

  if (track) {
    // Delete the audio file from disk
    try {
      const filepath = path.join(process.cwd(), "public", track.url);
      await unlink(filepath);
    } catch {
      // File may already be gone, continue
    }
  }

  const updated = tracks.filter((t) => t.id !== id);
  await writeTracksFile(updated);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const tracks = await readTracksFile();
  const updated = tracks.map((t) => t.id === id ? { ...t, ...body } : t);
  await writeTracksFile(updated);
  return NextResponse.json(updated.find((t) => t.id === id));
}

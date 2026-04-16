import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";

type Note = { id: string; text: string; color: string; created_at: string };

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notes = readDB<Note>("notes");
  writeDB("notes", notes.filter((n) => n.id !== id));
  return new NextResponse(null, { status: 204 });
}

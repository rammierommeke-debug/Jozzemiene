import { NextResponse } from "next/server";
import { readDB, writeDB, generateId } from "@/lib/db";

type Note = { id: string; text: string; color: string; created_at: string };

export async function GET() {
  const notes = readDB<Note>("notes");
  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  const body = await req.json();
  const notes = readDB<Note>("notes");
  const note: Note = {
    id: generateId(),
    text: body.text,
    color: body.color ?? "geel",
    created_at: new Date().toISOString(),
  };
  writeDB("notes", [note, ...notes]);
  return NextResponse.json(note, { status: 201 });
}

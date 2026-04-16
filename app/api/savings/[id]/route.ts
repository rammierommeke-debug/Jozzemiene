import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";

type Goal = {
  id: string;
  name: string;
  emoji: string;
  target: number;
  saved: number;
  date_from: string | null;
  date_to: string | null;
  created_at: string;
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const goals = readDB<Goal>("savings");
  const goal = goals.find((g) => g.id === id);
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.amount !== undefined) {
    goal.saved = goal.saved + body.amount;
  }
  if (body.date_from !== undefined) goal.date_from = body.date_from;
  if (body.date_to !== undefined) goal.date_to = body.date_to;

  writeDB("savings", goals);
  return NextResponse.json(goal);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const goals = readDB<Goal>("savings");
  writeDB("savings", goals.filter((g) => g.id !== id));
  return NextResponse.json({ ok: true });
}

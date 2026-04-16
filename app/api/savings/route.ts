import { NextResponse } from "next/server";
import { readDB, writeDB, generateId } from "@/lib/db";

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

export async function GET() {
  const goals = readDB<Goal>("savings");
  return NextResponse.json(goals);
}

export async function POST(req: Request) {
  const body = await req.json();
  const goals = readDB<Goal>("savings");
  const goal: Goal = {
    id: generateId(),
    name: body.name,
    emoji: body.emoji || "🎯",
    target: body.target,
    saved: 0,
    date_from: body.date_from || null,
    date_to: body.date_to || null,
    created_at: new Date().toISOString(),
  };
  writeDB("savings", [goal, ...goals]);
  return NextResponse.json(goal, { status: 201 });
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function icsDate(dateStr: string, timeStr: string | null): string {
  if (timeStr) {
    const dt = new Date(`${dateStr}T${timeStr}:00`);
    return dt.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }
  return dateStr.replace(/-/g, "");
}

export async function GET() {
  const { data, error } = await supabase.from("events").select("*").order("date");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const events = data ?? [];

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jozzemiene//Kalender//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Jozzemiene",
    "X-WR-TIMEZONE:Europe/Brussels",
  ];

  for (const ev of events) {
    const allDay = !ev.time;
    const dtstart = allDay
      ? `DTSTART;VALUE=DATE:${icsDate(ev.date, null)}`
      : `DTSTART:${icsDate(ev.date, ev.time)}`;
    const dtend = allDay
      ? `DTEND;VALUE=DATE:${icsDate(ev.date, null)}`
      : `DTEND:${icsDate(ev.date, ev.time)}`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.id}@jozzemiene`,
      `SUMMARY:${ev.title} (${ev.person})`,
      dtstart,
      dtend,
      `CATEGORIES:${ev.category}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

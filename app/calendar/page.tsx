"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Trash2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";

type Event = {
  id: string;
  title: string;
  date: string;
  emoji: string;
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("📅");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadEvents() {
    setRefreshing(true);
    await fetch("/api/events")
      .then((r) => r.json())
      .then((data) => setEvents(data))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { loadEvents(); }, []);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const eventsOnDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.date), day));

  const eventsOnSelected = selectedDate ? eventsOnDay(selectedDate) : [];

  async function addEvent() {
    if (!newTitle.trim() || !selectedDate) return;
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        date: format(selectedDate, "yyyy-MM-dd"),
        emoji: newEmoji,
      }),
    });
    const created = await res.json();
    setEvents((prev) => [...prev, created]);
    setNewTitle("");
  }

  async function deleteEvent(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  const startDay = startOfMonth(currentMonth).getDay();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Calendar className="text-sage" size={28} />
        <h1 className="font-display text-3xl text-brown">Our Calendar</h1>
        <button
          onClick={loadEvents}
          disabled={refreshing}
          className="ml-auto p-2 rounded-xl hover:bg-warm transition-colors text-brown-light disabled:opacity-50"
          title="Vernieuwen"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Calendar grid */}
        <div className="md:col-span-3 bg-warm rounded-3xl p-5 border border-warm">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-cream transition-colors">
              <ChevronLeft size={18} className="text-brown" />
            </button>
            <h2 className="font-display text-xl text-brown">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-cream transition-colors">
              <ChevronRight size={18} className="text-brown" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-brown-light py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map((day) => {
              const hasEvents = eventsOnDay(day).length > 0;
              const selected = selectedDate && isSameDay(day, selectedDate);
              const today = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square rounded-2xl text-sm flex flex-col items-center justify-center transition-all duration-150 relative
                    ${selected ? "bg-terracotta text-cream shadow-sm" : today ? "bg-rose-light text-brown font-bold" : "hover:bg-cream text-brown"}
                    ${!isSameMonth(day, currentMonth) ? "opacity-30" : ""}
                  `}
                >
                  {format(day, "d")}
                  {hasEvents && (
                    <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${selected ? "bg-cream" : "bg-terracotta"}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day detail panel */}
        <div className="md:col-span-2 flex flex-col gap-4">
          {selectedDate ? (
            <>
              <div className="bg-cream rounded-3xl p-5 border border-warm">
                <p className="font-handwriting text-xl text-brown mb-3">
                  {format(selectedDate, "EEEE, MMM d")}
                </p>
                {loading ? (
                  <p className="text-sm text-brown-light">Loading...</p>
                ) : eventsOnSelected.length === 0 ? (
                  <p className="text-sm text-brown-light italic">No events yet 🌿</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {eventsOnSelected.map((e) => (
                      <li key={e.id} className="flex items-center gap-2 group">
                        <span>{e.emoji}</span>
                        <span className="flex-1 text-sm text-brown">{e.title}</span>
                        <button
                          onClick={() => deleteEvent(e.id)}
                          className="opacity-0 group-hover:opacity-100 text-rose hover:text-rose transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Add event */}
              <div className="bg-sage-light/30 rounded-3xl p-5 border border-warm">
                <p className="font-semibold text-sm text-brown mb-3">Add event</p>
                <div className="flex gap-2 mb-2">
                  <input
                    value={newEmoji}
                    onChange={(e) => setNewEmoji(e.target.value)}
                    className="w-10 bg-cream rounded-xl border border-warm text-center text-sm py-2 focus:outline-none focus:border-sage"
                    maxLength={2}
                  />
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addEvent()}
                    placeholder="Event name..."
                    className="flex-1 bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-sage"
                  />
                </div>
                <button
                  onClick={addEvent}
                  className="w-full bg-sage text-cream rounded-xl py-2 text-sm font-semibold hover:bg-sage/80 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Add
                </button>
              </div>
            </>
          ) : (
            <div className="bg-cream rounded-3xl p-5 border border-warm flex flex-col items-center justify-center gap-2 h-40">
              <Calendar size={28} className="text-warm" />
              <p className="text-sm text-brown-light text-center">
                Pick a day to see or add events
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { Heart, Sun, Calendar, Image, PiggyBank, Lightbulb, UtensilsCrossed, Plus, X, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

const quickLinks = [
  { href: "/kalender", icon: Calendar, label: "Kalender", desc: "Komende afspraken & plannen", color: "bg-sage-light", iconColor: "text-sage" },
  { href: "/fotos", icon: Image, label: "Foto's", desc: "Onze gedeelde herinneringen", color: "bg-rose-light", iconColor: "text-rose" },
  { href: "/sparen", icon: PiggyBank, label: "Sparen", desc: "Onze spaardoelen", color: "bg-warm", iconColor: "text-brown-light" },
  { href: "/ideetjes", icon: Lightbulb, label: "Ideetjes", desc: "Dingen die we willen doen", color: "bg-terracotta-light/30", iconColor: "text-terracotta" },
  { href: "/menu", icon: UtensilsCrossed, label: "Menu", desc: "Het menu van deze week", color: "bg-sage-light/40", iconColor: "text-sage" },
];

const NOTE_COLORS = [
  { value: "geel",     bg: "#fef9c3", border: "#fde047" },
  { value: "roze",     bg: "#fce7f3", border: "#f9a8d4" },
  { value: "groen",    bg: "#dcfce7", border: "#86efac" },
  { value: "blauw",    bg: "#dbeafe", border: "#93c5fd" },
];

type Note = { id: string; text: string; color: string };

type WeatherDay = { date: string; code: number; max: number; min: number };

function weatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌦️";
  if (code <= 99) return "⛈️";
  return "🌡️";
}

function weatherLabel(code: number): string {
  if (code === 0) return "Zonnig";
  if (code <= 2) return "Licht bewolkt";
  if (code === 3) return "Bewolkt";
  if (code <= 48) return "Mist";
  if (code <= 55) return "Motregen";
  if (code <= 67) return "Regen";
  if (code <= 77) return "Sneeuw";
  if (code <= 82) return "Buien";
  if (code <= 99) return "Onweer";
  return "Onbekend";
}

export default function HomePage() {
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 6 ? "Goeienacht" : hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";

  const dateStr = now.toLocaleDateString("nl-NL", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newText, setNewText] = useState("");
  const [newColor, setNewColor] = useState("geel");
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function loadAll() {
    setRefreshing(true);
    await Promise.all([
      fetch("https://api.open-meteo.com/v1/forecast?latitude=51.02&longitude=3.38&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FBrussels&forecast_days=7")
        .then(r => r.json())
        .then(d => {
          const days: WeatherDay[] = d.daily.time.map((date: string, i: number) => ({
            date,
            code: d.daily.weathercode[i],
            max: Math.round(d.daily.temperature_2m_max[i]),
            min: Math.round(d.daily.temperature_2m_min[i]),
          }));
          setWeather(days);
        })
        .catch(() => {}),
      fetch("/api/notes")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setNotes(data); })
        .catch(() => {}),
    ]);
    setRefreshing(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function addNote() {
    if (!newText.trim()) return;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText.trim(), color: newColor }),
    });
    if (res.ok) {
      const note = await res.json();
      setNotes((prev) => [note, ...prev]);
    }
    setNewText("");
    setAdding(false);
  }

  async function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
  }

  const colorStyle = NOTE_COLORS.find((c) => c.value === newColor) ?? NOTE_COLORS[0];

  return (
    <div className="max-w-3xl mx-auto pt-14 md:pt-0">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Sun className="text-terracotta" size={28} />
          <h1 className="font-display text-4xl text-brown">{greeting}</h1>
          <Heart className="text-rose fill-rose" size={24} />
          <button
            onClick={loadAll}
            disabled={refreshing}
            className="ml-auto p-2 rounded-xl hover:bg-warm transition-colors text-brown-light disabled:opacity-50"
            title="Vernieuwen"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
        <p className="font-handwriting text-xl text-brown-light ml-1 capitalize">{dateStr}</p>
        {weather.length > 0 && (
          <div className="mt-4 bg-warm rounded-3xl border border-warm/80 overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-3 pb-2">
              <span className="text-xs font-semibold text-brown-light uppercase tracking-wide">Ruiselede — deze week</span>
            </div>
            <div className="grid grid-cols-7 divide-x divide-warm/60">
              {weather.map((day, i) => {
                const d = new Date(day.date);
                const dayLabel = i === 0 ? "Vand." : i === 1 ? "Morg." : d.toLocaleDateString("nl-NL", { weekday: "short" }).slice(0, 2);
                return (
                  <div key={day.date} className={`flex flex-col items-center py-3 gap-1 ${i === 0 ? "bg-terracotta/10" : ""}`}>
                    <span className="text-[10px] font-semibold text-brown-light capitalize">{dayLabel}</span>
                    <span className="text-xl">{weatherIcon(day.code)}</span>
                    <span className="text-xs font-bold text-brown">{day.max}°</span>
                    <span className="text-[10px] text-brown-light">{day.min}°</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <h2 className="font-display text-2xl text-brown mb-4">Wat wil je doen?</h2>
      <div className="grid grid-cols-2 gap-4 mb-10">
        {quickLinks.map(({ href, icon: Icon, label, desc, color, iconColor }) => (
          <Link
            key={href}
            href={href}
            className={`${color} rounded-3xl p-6 flex flex-col gap-3 border border-warm hover:shadow-md transition-all duration-200 group hover:-translate-y-0.5`}
          >
            <div className={`${iconColor} group-hover:scale-110 transition-transform duration-200`}>
              <Icon size={28} />
            </div>
            <div>
              <p className="font-display text-lg text-brown">{label}</p>
              <p className="text-sm text-brown-light">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Niet Vergeten */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 22 }}>📝</span>
            <h2 className="font-display text-2xl text-brown">Niet vergeten</h2>
          </div>
          <button
            onClick={() => setAdding(!adding)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl text-sm font-semibold transition-colors border border-warm bg-warm text-brown hover:bg-cream"
          >
            <Plus size={14} /> Notitie
          </button>
        </div>

        {adding && (
          <div
            className="rounded-3xl p-4 mb-4 border-2"
            style={{ backgroundColor: colorStyle.bg, borderColor: colorStyle.border }}
          >
            {/* Kleurkiezer */}
            <div className="flex gap-2 mb-3">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setNewColor(c.value)}
                  style={{ backgroundColor: c.bg, borderColor: newColor === c.value ? "#6b4c3b" : c.border }}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                />
              ))}
            </div>
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); } }}
              placeholder="bv. De buurman komt morgen de boor terugbrengen"
              autoFocus
              rows={2}
              style={{ color: "#6b4c3b", backgroundColor: "transparent" }}
              className="w-full focus:outline-none resize-none font-handwriting text-lg w-full"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={addNote}
                style={{ backgroundColor: colorStyle.border, color: "#6b4c3b" }}
                className="flex-1 rounded-xl py-1.5 text-sm font-semibold transition-opacity hover:opacity-80"
              >
                Plakken
              </button>
              <button
                onClick={() => { setAdding(false); setNewText(""); }}
                className="flex-1 bg-warm text-brown-light rounded-xl py-1.5 text-sm hover:bg-cream transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}

        {notes.length === 0 && !adding ? (
          <p className="text-brown-light font-handwriting text-lg">Niets te onthouden — geniet ervan! 🌿</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {notes.map((note) => {
              const style = NOTE_COLORS.find((c) => c.value === note.color) ?? NOTE_COLORS[0];
              return (
                <div
                  key={note.id}
                  className="rounded-2xl p-4 relative shadow-sm"
                  style={{ backgroundColor: style.bg, border: `1.5px solid ${style.border}` }}
                >
                  <p className="font-handwriting text-lg leading-snug pr-5" style={{ color: "#6b4c3b", whiteSpace: "pre-wrap" }}>
                    {note.text}
                  </p>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="absolute top-2 right-2 transition-opacity"
                    style={{ color: "#9a7060" }}
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

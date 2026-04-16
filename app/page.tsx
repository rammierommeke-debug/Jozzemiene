"use client";

import { Heart, Sun, Calendar, Image, PiggyBank, Lightbulb, UtensilsCrossed, Plus, X } from "lucide-react";
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

export default function HomePage() {
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 6 ? "Goeienacht" : hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";

  const dateStr = now.toLocaleDateString("nl-NL", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const [notes, setNotes] = useState<Note[]>([]);
  const [newText, setNewText] = useState("");
  const [newColor, setNewColor] = useState("geel");
  const [adding, setAdding] = useState(false);

  // Laad notities van de server
  useEffect(() => {
    fetch("/api/notes")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setNotes(data); })
      .catch(() => {});
  }, []);

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
          <h1 className="font-display text-4xl text-brown">{greeting}, mensen</h1>
          <Heart className="text-rose fill-rose" size={24} />
        </div>
        <p className="font-handwriting text-xl text-brown-light ml-1 capitalize">{dateStr}</p>
        <div className="mt-4 p-4 bg-warm rounded-3xl border border-warm/80">
          <p className="font-handwriting text-lg text-brown text-center">
            "Samen sterk. Maar ook prima apart. 🤝"
          </p>
        </div>
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

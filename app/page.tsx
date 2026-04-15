"use client";

import { Heart, Sun, Calendar, Image, PiggyBank, Lightbulb, UtensilsCrossed, StickyNote, Plus, X } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

const quickLinks = [
  {
    href: "/kalender",
    icon: Calendar,
    label: "Kalender",
    desc: "Komende afspraken & plannen",
    color: "bg-sage-light",
    iconColor: "text-sage",
  },
  {
    href: "/fotos",
    icon: Image,
    label: "Foto's",
    desc: "Onze gedeelde herinneringen",
    color: "bg-rose-light",
    iconColor: "text-rose",
  },
  {
    href: "/sparen",
    icon: PiggyBank,
    label: "Sparen",
    desc: "Onze spaardoelen",
    color: "bg-warm",
    iconColor: "text-brown-light",
  },
  {
    href: "/ideetjes",
    icon: Lightbulb,
    label: "Ideetjes",
    desc: "Dingen die we willen doen",
    color: "bg-terracotta-light/30",
    iconColor: "text-terracotta",
  },
  {
    href: "/menu",
    icon: UtensilsCrossed,
    label: "Menu",
    desc: "Het menu van deze week",
    color: "bg-sage-light/40",
    iconColor: "text-sage",
  },
];

const NOTE_COLORS = [
  { label: "Geel", value: "yellow", bg: "bg-yellow-100", border: "border-yellow-300", text: "text-yellow-900" },
  { label: "Roze", value: "pink", bg: "bg-rose-100", border: "border-rose-300", text: "text-rose-900" },
  { label: "Groen", value: "green", bg: "bg-sage-light", border: "border-sage", text: "text-sage" },
  { label: "Blauw", value: "blue", bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-900" },
];

type Note = { id: string; text: string; color: string; created_at: string };

function getNoteStyle(color: string) {
  return NOTE_COLORS.find((c) => c.value === color) ?? NOTE_COLORS[0];
}

export default function HomePage() {
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 6 ? "Goeienacht" : hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";

  const dateStr = now.toLocaleDateString("nl-NL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const [notes, setNotes] = useState<Note[]>([]);
  const [newText, setNewText] = useState("");
  const [newColor, setNewColor] = useState("yellow");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/notes").then((r) => r.json()).then((d) => setNotes(Array.isArray(d) ? d : []));
  }, []);

  async function addNote() {
    if (!newText.trim()) return;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText, color: newColor }),
    });
    const created = await res.json();
    setNotes((prev) => [created, ...prev]);
    setNewText("");
    setAdding(false);
  }

  async function deleteNote(id: string) {
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto pt-14 md:pt-0">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Sun className="text-terracotta" size={28} />
          <h1 className="font-display text-4xl text-brown">
            {greeting}, mensen
          </h1>
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
            <StickyNote className="text-yellow-600" size={22} />
            <h2 className="font-display text-2xl text-brown">Niet vergeten</h2>
          </div>
          <button
            onClick={() => setAdding(!adding)}
            className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-2xl text-sm font-semibold hover:bg-yellow-200 transition-colors border border-yellow-300"
          >
            <Plus size={14} /> Notitie
          </button>
        </div>

        {adding && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-3xl p-4 mb-4">
            <div className="flex gap-2 mb-3">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setNewColor(c.value)}
                  className={`w-7 h-7 rounded-full border-2 ${c.bg} ${newColor === c.value ? "border-brown scale-110" : "border-transparent"} transition-all`}
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
              className="w-full bg-transparent focus:outline-none resize-none font-handwriting text-lg text-brown"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={addNote} className="flex-1 bg-yellow-300 text-yellow-900 rounded-xl py-1.5 text-sm font-semibold hover:bg-yellow-400 transition-colors">Plakken</button>
              <button onClick={() => { setAdding(false); setNewText(""); }} className="flex-1 bg-warm text-brown-light rounded-xl py-1.5 text-sm hover:bg-warm/80">Annuleren</button>
            </div>
          </div>
        )}

        {notes.length === 0 && !adding ? (
          <p className="text-brown-light text-sm font-handwriting text-lg">Niets te onthouden — geniet ervan! 🌿</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {notes.map((note) => {
              const style = getNoteStyle(note.color);
              return (
                <div key={note.id} className={`${style.bg} ${style.border} border rounded-2xl p-4 relative group shadow-sm`}>
                  <p className={`font-handwriting text-lg ${style.text} leading-snug`} style={{ whiteSpace: "pre-wrap" }}>{note.text}</p>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-brown/40 hover:text-rose"
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

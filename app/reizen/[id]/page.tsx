"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, Image, Type, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { use } from "react";

type Block = { type: "text" | "photo"; content: string; caption?: string };
type Trip = {
  id: string; title: string; destination: string; flag: string;
  dateFrom: string; dateTo: string; description: string;
  coverColor: string; blocks: Block[]; created_at: string;
};

export default function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<"text" | "photo" | null>(null);
  const [newText, setNewText] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/trips/${id}`).then((r) => r.json()).then(setTrip).finally(() => setLoading(false));
  }, [id]);

  async function addText() {
    if (!newText.trim() || !trip) return;
    const res = await fetch(`/api/trips/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newText }),
    });
    const updated = await res.json();
    setTrip(updated);
    setNewText(""); setAdding(null);
  }

  async function addPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !trip) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("caption", newCaption);
    const res = await fetch(`/api/trips/${id}`, { method: "POST", body: form });
    const updated = await res.json();
    setTrip(updated);
    setNewCaption(""); setAdding(null); setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function deleteBlock(idx: number) {
    if (!trip) return;
    const blocks = trip.blocks.filter((_, i) => i !== idx);
    const res = await fetch(`/api/trips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });
    const updated = await res.json();
    setTrip(updated);
  }

  if (loading) return <div className="text-center mt-20 text-brown-light">Laden...</div>;
  if (!trip) return <div className="text-center mt-20 text-brown-light">Reis niet gevonden.</div>;

  return (
    <div className="max-w-2xl mx-auto pt-14 md:pt-0">
      {/* Back */}
      <Link href="/reizen" className="inline-flex items-center gap-2 text-brown-light hover:text-terracotta transition-colors mb-6 text-sm font-semibold">
        <ArrowLeft size={16} /> Terug naar reizen
      </Link>

      {/* Hero header */}
      <div className="rounded-3xl overflow-hidden mb-8" style={{ background: `linear-gradient(135deg, ${trip.coverColor}cc, ${trip.coverColor})` }}>
        <div className="p-8">
          <span className="text-5xl block mb-3">{trip.flag}</span>
          <h1 className="font-display text-4xl text-cream mb-1">{trip.title}</h1>
          <p className="text-cream/80 text-lg mb-3">{trip.destination}</p>
          {(trip.dateFrom || trip.dateTo) && (
            <p className="text-cream/70 text-sm">
              {trip.dateFrom && format(new Date(trip.dateFrom), "d MMMM yyyy", { locale: nl })}
              {trip.dateFrom && trip.dateTo && " – "}
              {trip.dateTo && format(new Date(trip.dateTo), "d MMMM yyyy", { locale: nl })}
            </p>
          )}
        </div>
      </div>

      {/* Beschrijving */}
      {trip.description && (
        <p className="font-handwriting text-xl text-brown mb-8 leading-relaxed">{trip.description}</p>
      )}

      {/* Blog blokken */}
      <div className="flex flex-col gap-6 mb-8">
        {trip.blocks.map((block, i) => (
          <div key={i} className="group relative">
            {block.type === "text" ? (
              <div className="bg-cream rounded-3xl p-6 border border-warm">
                <p className="text-brown leading-relaxed whitespace-pre-wrap">{block.content}</p>
              </div>
            ) : (
              <div className="rounded-3xl overflow-hidden">
                <NextImage src={block.content} alt={block.caption || ""} width={800} height={500} className="w-full object-cover" />
                {block.caption && (
                  <div className="bg-warm px-5 py-3">
                    <p className="font-handwriting text-lg text-brown">{block.caption}</p>
                  </div>
                )}
              </div>
            )}
            <button onClick={() => deleteBlock(i)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 bg-rose/90 text-cream rounded-xl p-1.5 hover:bg-rose transition-all">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Toevoegen */}
      {adding === "text" ? (
        <div className="bg-warm rounded-3xl p-5 border border-warm mb-4">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Schrijf hier je verhaal..."
            rows={5}
            autoFocus
            className="w-full bg-cream rounded-xl border border-warm px-4 py-3 text-sm text-brown focus:outline-none focus:border-terracotta resize-none mb-3"
          />
          <div className="flex gap-2">
            <button onClick={addText} className="flex-1 bg-terracotta text-cream rounded-xl py-2 text-sm font-semibold hover:bg-terracotta/80">Toevoegen</button>
            <button onClick={() => setAdding(null)} className="flex-1 bg-cream text-brown-light rounded-xl py-2 text-sm hover:bg-warm">Annuleren</button>
          </div>
        </div>
      ) : adding === "photo" ? (
        <div className="bg-warm rounded-3xl p-5 border border-warm mb-4">
          <input value={newCaption} onChange={(e) => setNewCaption(e.target.value)} placeholder="Bijschrift (optioneel)..." className="w-full bg-cream rounded-xl border border-warm px-4 py-2 text-sm text-brown focus:outline-none focus:border-terracotta mb-3" />
          <input ref={fileRef} type="file" accept="image/*" onChange={addPhoto} className="hidden" />
          <div className="flex gap-2">
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex-1 flex items-center justify-center gap-2 bg-terracotta text-cream rounded-xl py-2 text-sm font-semibold hover:bg-terracotta/80 disabled:opacity-50">
              <Upload size={14} /> {uploading ? "Uploaden..." : "Foto kiezen"}
            </button>
            <button onClick={() => setAdding(null)} className="flex-1 bg-cream text-brown-light rounded-xl py-2 text-sm hover:bg-warm">Annuleren</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <button onClick={() => setAdding("text")} className="flex-1 flex items-center justify-center gap-2 bg-warm border-2 border-dashed border-warm hover:border-terracotta hover:bg-terracotta/10 text-brown-light hover:text-terracotta rounded-3xl py-4 text-sm font-semibold transition-all">
            <Type size={18} /> Tekst toevoegen
          </button>
          <button onClick={() => setAdding("photo")} className="flex-1 flex items-center justify-center gap-2 bg-warm border-2 border-dashed border-warm hover:border-rose hover:bg-rose/10 text-brown-light hover:text-rose rounded-3xl py-4 text-sm font-semibold transition-all">
            <Image size={18} /> Foto toevoegen
          </button>
        </div>
      )}
    </div>
  );
}

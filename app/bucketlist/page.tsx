"use client";

import { useState, useEffect } from "react";
import { Star, Plus, Trash2, X } from "lucide-react";

type BucketItem = {
  id: string;
  title: string;
  emoji: string;
  progress: number;
  created_at: string;
};

const EMOJIS = ["🌟", "✈️", "🏔️", "🌊", "🎉", "💪", "🍕", "🎭", "🌍", "🏠", "🎶", "📚", "🌸", "🚀", "🦋", "🍾"];

export default function BucketListPage() {
  const [items, setItems] = useState<BucketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("🌟");

  useEffect(() => {
    fetch("/api/bucketlist")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  async function addItem() {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/bucketlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, emoji: newEmoji, progress: 0 }),
    });
    const created = await res.json();
    setItems((prev) => [...prev, created]);
    setNewTitle("");
    setNewEmoji("🌟");
    setShowForm(false);
  }

  async function updateProgress(item: BucketItem, progress: number) {
    const res = await fetch(`/api/bucketlist/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress }),
    });
    const updated = await res.json();
    setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i));
  }

  async function deleteItem(id: string) {
    await fetch(`/api/bucketlist/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const done = items.filter((i) => i.progress === 100).length;
  const total = items.length;
  const overallProgress = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Star className="text-terracotta fill-terracotta" size={28} />
          <h1 className="font-display text-3xl text-brown">Bucket List</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-terracotta text-cream px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-terracotta/80 transition-colors"
        >
          <Plus size={16} /> Doel toevoegen
        </button>
      </div>

      {/* Totale voortgang */}
      {total > 0 && (
        <div className="bg-warm rounded-3xl p-5 mb-6 border border-warm">
          <div className="flex justify-between items-center mb-2">
            <p className="font-display text-brown text-sm">Totale voortgang</p>
            <p className="font-display text-terracotta text-sm">{done}/{total} voltooid</p>
          </div>
          <div className="w-full bg-cream rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-terracotta to-rose transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="text-xs text-brown-light mt-1 text-right">{overallProgress}%</p>
        </div>
      )}

      {/* Formulier */}
      {showForm && (
        <div className="bg-warm rounded-3xl p-5 border border-warm mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-display text-brown">Nieuw doel</p>
            <button onClick={() => setShowForm(false)} className="text-brown-light hover:text-rose transition-colors"><X size={18} /></button>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => setNewEmoji(e)} className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${newEmoji === e ? "bg-terracotta/20 ring-2 ring-terracotta" : "bg-cream hover:bg-warm"}`}>{e}</button>
            ))}
          </div>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addItem(); if (e.key === "Escape") setShowForm(false); }}
            placeholder="bv. Roadtrip door Italië"
            autoFocus
            className="w-full bg-cream rounded-xl border border-warm px-4 py-2 text-sm text-brown focus:outline-none focus:border-terracotta mb-3"
          />
          <div className="flex gap-2">
            <button onClick={addItem} className="flex-1 bg-terracotta text-cream rounded-xl py-2 text-sm font-semibold hover:bg-terracotta/80">Toevoegen</button>
            <button onClick={() => setShowForm(false)} className="flex-1 bg-cream text-brown-light rounded-xl py-2 text-sm hover:bg-warm">Annuleren</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-brown-light text-center mt-10">Laden...</p>
      ) : items.length === 0 ? (
        <div className="text-center mt-16">
          <p className="font-handwriting text-2xl text-brown-light">Nog geen doelen 🌟</p>
          <p className="text-sm text-brown-light mt-1">Voeg jullie eerste grote droom toe!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.id} className={`bg-cream rounded-3xl p-5 border border-warm group transition-all ${item.progress === 100 ? "opacity-70" : ""}`}>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl mt-0.5">{item.emoji}</span>
                <div className="flex-1">
                  <p className={`font-display text-brown text-lg ${item.progress === 100 ? "line-through text-brown-light" : ""}`}>{item.title}</p>
                  <p className="text-xs text-brown-light mt-0.5">{item.progress}% voltooid</p>
                </div>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-rose hover:text-rose/70 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {/* Voortgangsbalk */}
              <div className="w-full bg-warm rounded-full h-2.5 overflow-hidden mb-2">
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 ${item.progress === 100 ? "bg-sage" : "bg-gradient-to-r from-terracotta to-rose"}`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              {/* Stappenknoppen */}
              <div className="flex gap-1.5 flex-wrap">
                {[0, 25, 50, 75, 100].map((p) => (
                  <button
                    key={p}
                    onClick={() => updateProgress(item, p)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${item.progress === p ? "bg-terracotta text-cream" : "bg-warm text-brown-light hover:bg-terracotta/20"}`}
                  >
                    {p === 100 ? "✓ Gedaan!" : `${p}%`}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { PiggyBank, Plus, Trash2, Euro } from "lucide-react";

type Goal = {
  id: string;
  name: string;
  emoji: string;
  target: number;
  saved: number;
  created_at: string;
};

export default function SparenPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [target, setTarget] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState("");

  useEffect(() => {
    fetch("/api/savings")
      .then((r) => r.json())
      .then((data) => setGoals(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  async function createGoal() {
    if (!name.trim() || !target) return;
    const res = await fetch("/api/savings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, emoji, target: parseFloat(target) }),
    });
    const created = await res.json();
    setGoals((prev) => [created, ...prev]);
    setName(""); setEmoji("🎯"); setTarget(""); setShowForm(false);
  }

  async function addSavings(id: string) {
    const amount = parseFloat(addAmount);
    if (!amount || amount <= 0) return;
    const res = await fetch(`/api/savings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const updated = await res.json();
    setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
    setAddingTo(null);
    setAddAmount("");
  }

  async function deleteGoal(id: string) {
    await fetch(`/api/savings/${id}`, { method: "DELETE" });
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  const totalSaved = goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);

  return (
    <div className="max-w-2xl mx-auto pt-14 md:pt-0">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <PiggyBank className="text-terracotta" size={28} />
          <h1 className="font-display text-3xl text-brown">Onze Spaarpot</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-terracotta text-cream px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-terracotta/80 transition-colors"
        >
          <Plus size={16} /> Nieuw doel
        </button>
      </div>

      {/* Totaal overzicht */}
      {goals.length > 0 && (
        <div className="bg-warm rounded-3xl p-6 border border-warm mb-6">
          <p className="font-handwriting text-xl text-brown mb-3">Totaal overzicht</p>
          <div className="flex justify-between text-sm text-brown mb-2">
            <span>Gespaard</span>
            <span className="font-semibold">€{totalSaved.toFixed(2)} / €{totalTarget.toFixed(2)}</span>
          </div>
          <div className="w-full bg-cream rounded-full h-3 overflow-hidden">
            <div
              className="bg-sage h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((totalSaved / totalTarget) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-brown-light mt-2 text-right">
            {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}% van het totaal
          </p>
        </div>
      )}

      {/* Nieuw doel formulier */}
      {showForm && (
        <div className="bg-sage-light/30 rounded-3xl p-6 border border-warm mb-6">
          <p className="font-semibold text-brown mb-4 text-sm">Nieuw spaardoel aanmaken</p>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="w-12 bg-cream rounded-xl border border-warm text-center py-2 focus:outline-none focus:border-sage"
                maxLength={2}
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Naam van het doel (bv. Vakantie Parijs)"
                className="flex-1 bg-cream rounded-xl border border-warm px-4 py-2 text-sm text-brown focus:outline-none focus:border-sage"
              />
            </div>
            <div className="relative">
              <Euro size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-light" />
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                type="number"
                min="1"
                placeholder="Streefbedrag"
                className="w-full bg-cream rounded-xl border border-warm pl-8 pr-4 py-2 text-sm text-brown focus:outline-none focus:border-sage"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={createGoal}
                className="flex-1 bg-sage text-cream rounded-xl py-2 text-sm font-semibold hover:bg-sage/80 transition-colors"
              >
                Aanmaken
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-warm text-brown-light rounded-xl py-2 text-sm font-semibold hover:bg-warm/80 transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doelen lijst */}
      {loading ? (
        <p className="text-brown-light text-sm text-center mt-10">Laden...</p>
      ) : goals.length === 0 ? (
        <div className="text-center mt-20">
          <p className="font-handwriting text-2xl text-brown-light">Nog geen spaardoelen 🐷</p>
          <p className="text-sm text-brown-light mt-1">Maak jullie eerste doel aan!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {goals.map((goal) => {
            const pct = Math.min(Math.round((goal.saved / goal.target) * 100), 100);
            const done = goal.saved >= goal.target;
            return (
              <div key={goal.id} className={`bg-cream rounded-3xl p-5 border border-warm group ${done ? "ring-2 ring-sage/30" : ""}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{goal.emoji}</span>
                    <div>
                      <p className="font-display text-lg text-brown">{goal.name}</p>
                      {done && <p className="text-xs text-sage font-semibold">Doel bereikt! 🎉</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="opacity-0 group-hover:opacity-100 text-rose transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex justify-between text-sm text-brown mb-1.5">
                  <span className="text-brown-light">Gespaard</span>
                  <span className="font-semibold">€{goal.saved.toFixed(2)} / €{goal.target.toFixed(2)}</span>
                </div>
                <div className="w-full bg-warm rounded-full h-2.5 overflow-hidden mb-3">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${done ? "bg-sage" : "bg-terracotta"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-brown-light mb-3">{pct}% bereikt • nog €{Math.max(goal.target - goal.saved, 0).toFixed(2)} te gaan</p>

                {addingTo === goal.id ? (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Euro size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brown-light" />
                      <input
                        value={addAmount}
                        onChange={(e) => setAddAmount(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addSavings(goal.id); if (e.key === "Escape") setAddingTo(null); }}
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Bedrag"
                        autoFocus
                        className="w-full bg-warm rounded-xl border border-warm pl-7 pr-3 py-1.5 text-sm text-brown focus:outline-none focus:border-sage"
                      />
                    </div>
                    <button onClick={() => addSavings(goal.id)} className="bg-sage text-cream px-4 rounded-xl text-sm font-semibold hover:bg-sage/80">
                      Toevoegen
                    </button>
                    <button onClick={() => setAddingTo(null)} className="bg-warm text-brown-light px-3 rounded-xl text-sm hover:bg-warm/80">
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingTo(goal.id)}
                    className="flex items-center gap-2 text-sm text-terracotta font-semibold hover:text-terracotta/70 transition-colors"
                  >
                    <Plus size={14} /> Bedrag toevoegen
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

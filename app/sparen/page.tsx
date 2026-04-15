"use client";

import { useState, useEffect } from "react";
import { PiggyBank, Plus, Trash2, Euro, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { differenceInDays, differenceInWeeks, differenceInCalendarMonths, parseISO, format, isPast } from "date-fns";
import { nl } from "date-fns/locale";

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

type Period = "dag" | "week" | "maand";

function calcPeriod(goal: Goal, period: Period): { amount: number; units: number; label: string } | null {
  if (!goal.date_from || !goal.date_to) return null;
  const from = parseISO(goal.date_from);
  const to = parseISO(goal.date_to);
  const remaining = Math.max(goal.target - goal.saved, 0);
  const today = new Date();
  const start = today > from ? today : from;

  if (period === "dag") {
    const days = Math.max(differenceInDays(to, start), 1);
    return { amount: remaining / days, units: days, label: `${days} dagen` };
  }
  if (period === "week") {
    const weeks = Math.max(differenceInWeeks(to, start), 1);
    return { amount: remaining / weeks, units: weeks, label: `${weeks} weken` };
  }
  if (period === "maand") {
    const months = Math.max(differenceInCalendarMonths(to, start), 1);
    return { amount: remaining / months, units: months, label: `${months} maanden` };
  }
  return null;
}

export default function SparenPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [target, setTarget] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState("");
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Record<string, Period>>({});

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
      body: JSON.stringify({ name, emoji, target: parseFloat(target), date_from: dateFrom || null, date_to: dateTo || null }),
    });
    const created = await res.json();
    setGoals((prev) => [created, ...prev]);
    setName(""); setEmoji("🎯"); setTarget(""); setDateFrom(""); setDateTo(""); setShowForm(false);
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

  async function updatePeriod(id: string, date_from: string, date_to: string) {
    const res = await fetch(`/api/savings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date_from: date_from || null, date_to: date_to || null }),
    });
    const updated = await res.json();
    setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
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

      {/* Totaal */}
      {goals.length > 0 && (
        <div className="bg-warm rounded-3xl p-6 border border-warm mb-6">
          <p className="font-handwriting text-xl text-brown mb-3">Totaal overzicht</p>
          <div className="flex justify-between text-sm text-brown mb-2">
            <span>Gespaard</span>
            <span className="font-semibold">€{totalSaved.toFixed(2)} / €{totalTarget.toFixed(2)}</span>
          </div>
          <div className="w-full bg-cream rounded-full h-3 overflow-hidden">
            <div className="bg-sage h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min((totalSaved / totalTarget) * 100, 100)}%` }} />
          </div>
          <p className="text-xs text-brown-light mt-2 text-right">
            {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}% van het totaal
          </p>
        </div>
      )}

      {/* Formulier */}
      {showForm && (
        <div className="bg-sage-light/30 rounded-3xl p-6 border border-warm mb-6">
          <p className="font-semibold text-brown mb-4 text-sm">Nieuw spaardoel aanmaken</p>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-12 bg-cream rounded-xl border border-warm text-center py-2 focus:outline-none focus:border-sage" maxLength={2} />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Naam (bv. Vakantie Japan)" className="flex-1 bg-cream rounded-xl border border-warm px-4 py-2 text-sm text-brown focus:outline-none focus:border-sage" />
            </div>
            <div className="relative">
              <Euro size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-light" />
              <input value={target} onChange={(e) => setTarget(e.target.value)} type="number" min="1" placeholder="Streefbedrag" className="w-full bg-cream rounded-xl border border-warm pl-8 pr-4 py-2 text-sm text-brown focus:outline-none focus:border-sage" />
            </div>
            {/* Spaarperiode */}
            <div>
              <p className="text-xs text-brown-light mb-1.5 flex items-center gap-1"><CalendarDays size={12} /> Spaarperiode (optioneel)</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-brown-light mb-1 block">Van</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-sage" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-brown-light mb-1 block">Tot</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-sage" />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={createGoal} className="flex-1 bg-sage text-cream rounded-xl py-2 text-sm font-semibold hover:bg-sage/80 transition-colors">Aanmaken</button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-warm text-brown-light rounded-xl py-2 text-sm font-semibold hover:bg-warm/80 transition-colors">Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {/* Doelen */}
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
            const period = selectedPeriod[goal.id] ?? "week";
            const calc = calcPeriod(goal, period);
            const periodExpanded = expandedPeriod === goal.id;
            const deadlinePast = goal.date_to && isPast(parseISO(goal.date_to));

            return (
              <div key={goal.id} className={`bg-cream rounded-3xl p-5 border border-warm group ${done ? "ring-2 ring-sage/30" : ""}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{goal.emoji}</span>
                    <div>
                      <p className="font-display text-lg text-brown">{goal.name}</p>
                      {done
                        ? <p className="text-xs text-sage font-semibold">Doel bereikt! 🎉</p>
                        : goal.date_to && (
                          <p className={`text-xs font-semibold ${deadlinePast ? "text-rose" : "text-brown-light"}`}>
                            {deadlinePast ? "Deadline verstreken" : `Deadline: ${format(parseISO(goal.date_to), "d MMM yyyy", { locale: nl })}`}
                          </p>
                        )
                      }
                    </div>
                  </div>
                  <button onClick={() => deleteGoal(goal.id)} className="opacity-0 group-hover:opacity-100 text-rose transition-opacity">
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Voortgang */}
                <div className="flex justify-between text-sm text-brown mb-1.5">
                  <span className="text-brown-light">Gespaard</span>
                  <span className="font-semibold">€{goal.saved.toFixed(2)} / €{goal.target.toFixed(2)}</span>
                </div>
                <div className="w-full bg-warm rounded-full h-2.5 overflow-hidden mb-1">
                  <div className={`h-2.5 rounded-full transition-all duration-500 ${done ? "bg-sage" : "bg-terracotta"}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-brown-light mb-3">{pct}% bereikt · nog €{Math.max(goal.target - goal.saved, 0).toFixed(2)} te gaan</p>

                {/* Spaarperiode verdeler */}
                {!done && (
                  <div className="bg-warm rounded-2xl mb-3 overflow-hidden">
                    <button
                      onClick={() => setExpandedPeriod(periodExpanded ? null : goal.id)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-brown hover:bg-warm/80 transition-colors"
                    >
                      <span className="flex items-center gap-2"><CalendarDays size={14} className="text-sage" /> Spaarplan</span>
                      {periodExpanded ? <ChevronUp size={14} className="text-brown-light" /> : <ChevronDown size={14} className="text-brown-light" />}
                    </button>

                    {periodExpanded && (
                      <div className="px-4 pb-4 flex flex-col gap-3">
                        {/* Periode datums instellen */}
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs text-brown-light mb-1 block">Van</label>
                            <input
                              type="date"
                              defaultValue={goal.date_from ?? ""}
                              onBlur={(e) => updatePeriod(goal.id, e.target.value, goal.date_to ?? "")}
                              className="w-full bg-cream rounded-xl border border-warm px-2 py-1.5 text-xs text-brown focus:outline-none focus:border-sage"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-brown-light mb-1 block">Tot</label>
                            <input
                              type="date"
                              defaultValue={goal.date_to ?? ""}
                              onBlur={(e) => updatePeriod(goal.id, goal.date_from ?? "", e.target.value)}
                              className="w-full bg-cream rounded-xl border border-warm px-2 py-1.5 text-xs text-brown focus:outline-none focus:border-sage"
                            />
                          </div>
                        </div>

                        {/* Per dag/week/maand */}
                        {goal.date_from && goal.date_to ? (
                          <>
                            <div className="flex gap-1.5">
                              {(["dag", "week", "maand"] as Period[]).map((p) => (
                                <button
                                  key={p}
                                  onClick={() => setSelectedPeriod((prev) => ({ ...prev, [goal.id]: p }))}
                                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize ${period === p ? "bg-sage text-cream" : "bg-cream text-brown-light hover:bg-warm border border-warm"}`}
                                >
                                  Per {p}
                                </button>
                              ))}
                            </div>

                            {calc && (
                              <div className="bg-sage-light/40 rounded-2xl p-3 text-center">
                                <p className="text-2xl font-display text-sage font-bold">€{calc.amount.toFixed(2)}</p>
                                <p className="text-xs text-brown-light mt-0.5">per {period} · verdeeld over {calc.label}</p>
                                {calc.amount > (goal.target / (period === "dag" ? 365 : period === "week" ? 52 : 12)) * 3 && (
                                  <p className="text-xs text-terracotta mt-1 font-semibold">Ambitieus! Jullie kunnen het 💪</p>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-brown-light italic">Stel een begin- en einddatum in om te zien hoeveel je per dag/week/maand moet sparen.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Bedrag toevoegen */}
                {addingTo === goal.id ? (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Euro size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brown-light" />
                      <input
                        value={addAmount}
                        onChange={(e) => setAddAmount(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addSavings(goal.id); if (e.key === "Escape") setAddingTo(null); }}
                        type="number" min="0.01" step="0.01" placeholder="Bedrag"
                        autoFocus
                        className="w-full bg-warm rounded-xl border border-warm pl-7 pr-3 py-1.5 text-sm text-brown focus:outline-none focus:border-sage"
                      />
                    </div>
                    <button onClick={() => addSavings(goal.id)} className="bg-sage text-cream px-4 rounded-xl text-sm font-semibold hover:bg-sage/80">Toevoegen</button>
                    <button onClick={() => setAddingTo(null)} className="bg-warm text-brown-light px-3 rounded-xl text-sm hover:bg-warm/80">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setAddingTo(goal.id)} className="flex items-center gap-2 text-sm text-terracotta font-semibold hover:text-terracotta/70 transition-colors">
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

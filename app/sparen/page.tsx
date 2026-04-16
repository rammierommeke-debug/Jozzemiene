"use client";

import { useState, useEffect } from "react";
import { PiggyBank, Plus, Trash2, Euro, TrendingUp, Check, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, parseISO, differenceInDays, differenceInWeeks, differenceInCalendarMonths } from "date-fns";
import { nl } from "date-fns/locale";

type Entry = { amount: number; date: string };
type Goal = {
  id: string;
  name: string;
  emoji: string;
  target: number;
  dateFrom: string;
  dateTo: string;
  entries: Entry[];
};
type Period = "dag" | "week" | "maand";

function totalSaved(goal: Goal) {
  return goal.entries.reduce((s, e) => s + e.amount, 0);
}

function calcPeriod(goal: Goal, period: Period) {
  if (!goal.dateFrom || !goal.dateTo) return null;
  const from = parseISO(goal.dateFrom);
  const to = parseISO(goal.dateTo);
  const remaining = Math.max(goal.target - totalSaved(goal), 0);
  const start = new Date() > from ? new Date() : from;
  if (period === "dag") {
    const days = Math.max(differenceInDays(to, start), 1);
    return { amount: remaining / days, label: `${days} dagen` };
  }
  if (period === "week") {
    const weeks = Math.max(differenceInWeeks(to, start), 1);
    return { amount: remaining / weeks, label: `${weeks} weken` };
  }
  const months = Math.max(differenceInCalendarMonths(to, start), 1);
  return { amount: remaining / months, label: `${months} maanden` };
}

function buildMonthlyData(goals: Goal[]) {
  const map: Record<string, number> = {};
  goals.forEach((g) =>
    g.entries.forEach((e) => {
      const key = format(parseISO(e.date), "MMM yy", { locale: nl });
      map[key] = (map[key] ?? 0) + e.amount;
    })
  );
  return Object.entries(map).slice(-6).map(([month, amount]) => ({ month, amount }));
}

const STORAGE_KEY = "jozzemiene-savings";
function load(): Goal[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function save(goals: Goal[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(goals)); } catch {}
}

export default function SparenPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tab, setTab] = useState<"doelen" | "overzicht">("doelen");

  // Formulier
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [target, setTarget] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Per doel
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [periods, setPeriods] = useState<Record<string, Period>>({});

  useEffect(() => { setGoals(load()); }, []);

  function update(updated: Goal[]) { setGoals(updated); save(updated); }

  function createGoal() {
    if (!name.trim() || !target) return;
    const goal: Goal = {
      id: Date.now().toString(),
      name: name.trim(), emoji,
      target: parseFloat(target),
      dateFrom, dateTo,
      entries: [],
    };
    update([goal, ...goals]);
    setName(""); setEmoji("🎯"); setTarget(""); setDateFrom(""); setDateTo(""); setShowForm(false);
  }

  function addSavings(id: string) {
    const amount = parseFloat(addAmount);
    if (!amount || amount <= 0) return;
    update(goals.map((g) =>
      g.id === id ? { ...g, entries: [...g.entries, { amount, date: new Date().toISOString() }] } : g
    ));
    setAddingTo(null); setAddAmount("");
  }

  function updateDates(id: string, dateFrom: string, dateTo: string) {
    update(goals.map((g) => g.id === id ? { ...g, dateFrom, dateTo } : g));
  }

  function deleteGoal(id: string) { update(goals.filter((g) => g.id !== id)); }

  const allSaved = goals.reduce((s, g) => s + totalSaved(g), 0);
  const allTarget = goals.reduce((s, g) => s + g.target, 0);
  const monthlyData = buildMonthlyData(goals);

  return (
    <div className="max-w-2xl mx-auto pt-14 md:pt-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <PiggyBank className="text-terracotta" size={28} />
          <h1 className="font-display text-3xl text-brown">Onze Spaarpot</h1>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setTab("doelen"); }}
          className="flex items-center gap-2 bg-terracotta text-cream px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-terracotta/80 transition-colors"
        >
          <Plus size={16} /> Nieuw doel
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-warm rounded-2xl p-1">
        {(["doelen", "overzicht"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? "bg-cream text-brown shadow-sm" : "text-brown-light hover:text-brown"}`}>
            {t === "doelen" ? "🎯 Doelen" : "📊 Overzicht"}
          </button>
        ))}
      </div>

      {/* Formulier */}
      {showForm && (
        <div className="bg-sage-light/30 rounded-3xl p-6 border border-warm mb-6">
          <p className="font-semibold text-brown mb-4 text-sm">Nieuw spaardoel</p>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-12 bg-cream rounded-xl border border-warm text-center py-2 focus:outline-none focus:border-sage" maxLength={2} />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Naam (bv. Vakantie Italië)" className="flex-1 bg-cream rounded-xl border border-warm px-4 py-2 text-sm text-brown focus:outline-none focus:border-sage" />
            </div>
            <div className="relative">
              <Euro size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-light" />
              <input value={target} onChange={(e) => setTarget(e.target.value)} type="number" min="1" placeholder="Streefbedrag" className="w-full bg-cream rounded-xl border border-warm pl-8 pr-4 py-2 text-sm text-brown focus:outline-none focus:border-sage" />
            </div>
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
              <button onClick={createGoal} className="flex-1 bg-sage text-cream rounded-xl py-2.5 text-sm font-semibold hover:bg-sage/80 transition-colors">Aanmaken</button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-warm text-brown-light rounded-xl py-2.5 text-sm hover:bg-warm/80 transition-colors">Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DOELEN TAB ── */}
      {tab === "doelen" && (
        goals.length === 0 && !showForm ? (
          <div className="text-center mt-24">
            <p className="text-6xl mb-4">🐷</p>
            <p className="font-handwriting text-2xl text-brown-light">Nog geen spaardoelen</p>
            <p className="text-sm text-brown-light mt-1">Maak jullie eerste doel aan!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {goals.length > 0 && (
              <div className="bg-warm rounded-3xl p-5 border border-warm mb-2">
                <div className="flex justify-between text-sm text-brown mb-2">
                  <span className="font-handwriting text-lg">Totaal gespaard</span>
                  <span className="font-semibold">€{allSaved.toFixed(2)} / €{allTarget.toFixed(2)}</span>
                </div>
                <div className="w-full bg-cream rounded-full h-3 overflow-hidden">
                  <div className="bg-sage h-3 rounded-full transition-all duration-700" style={{ width: `${Math.min(allTarget > 0 ? (allSaved / allTarget) * 100 : 0, 100)}%` }} />
                </div>
                <p className="text-xs text-brown-light mt-1.5 text-right">{allTarget > 0 ? Math.round((allSaved / allTarget) * 100) : 0}%</p>
              </div>
            )}

            {goals.map((goal) => {
              const saved = totalSaved(goal);
              const pct = Math.min(goal.target > 0 ? Math.round((saved / goal.target) * 100) : 0, 100);
              const done = saved >= goal.target;
              const period = periods[goal.id] ?? "week";
              const calc = calcPeriod(goal, period);
              const expanded = expandedId === goal.id;

              return (
                <div key={goal.id} className={`bg-cream rounded-3xl p-5 border group ${done ? "border-sage/40 ring-2 ring-sage/20" : "border-warm"}`}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{goal.emoji}</span>
                      <div>
                        <p className="font-display text-lg text-brown">{goal.name}</p>
                        {done && <p className="text-xs text-sage font-semibold flex items-center gap-1"><Check size={11} /> Doel bereikt!</p>}
                      </div>
                    </div>
                    <button onClick={() => deleteGoal(goal.id)} className="opacity-0 group-hover:opacity-100 text-rose/60 hover:text-rose transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Voortgang */}
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-brown-light">Gespaard</span>
                    <span className="font-semibold text-brown">€{saved.toFixed(2)} / €{goal.target.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-warm rounded-full h-2.5 overflow-hidden mb-1">
                    <div className={`h-2.5 rounded-full transition-all duration-700 ${done ? "bg-sage" : "bg-terracotta"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-brown-light mb-4">{pct}% · nog €{Math.max(goal.target - saved, 0).toFixed(2)} te gaan</p>

                  {/* Spaarplan */}
                  {!done && (
                    <div className="bg-warm rounded-2xl mb-4 overflow-hidden">
                      <button
                        onClick={() => setExpandedId(expanded ? null : goal.id)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-brown"
                      >
                        <span className="flex items-center gap-2"><CalendarDays size={14} className="text-sage" /> Spaarplan</span>
                        {expanded ? <ChevronUp size={14} className="text-brown-light" /> : <ChevronDown size={14} className="text-brown-light" />}
                      </button>

                      {expanded && (
                        <div className="px-4 pb-4 flex flex-col gap-3">
                          {/* Datums */}
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-xs text-brown-light mb-1 block">Van</label>
                              <input type="date" defaultValue={goal.dateFrom}
                                onBlur={(e) => updateDates(goal.id, e.target.value, goal.dateTo)}
                                className="w-full bg-cream rounded-xl border border-warm px-2 py-1.5 text-xs text-brown focus:outline-none focus:border-sage" />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-brown-light mb-1 block">Tot</label>
                              <input type="date" defaultValue={goal.dateTo}
                                onBlur={(e) => updateDates(goal.id, goal.dateFrom, e.target.value)}
                                className="w-full bg-cream rounded-xl border border-warm px-2 py-1.5 text-xs text-brown focus:outline-none focus:border-sage" />
                            </div>
                          </div>

                          {goal.dateFrom && goal.dateTo ? (
                            <>
                              {/* Per dag/week/maand */}
                              <div className="flex gap-1.5">
                                {(["dag", "week", "maand"] as Period[]).map((p) => (
                                  <button key={p}
                                    onClick={() => setPeriods((prev) => ({ ...prev, [goal.id]: p }))}
                                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize ${period === p ? "bg-sage text-cream" : "bg-cream text-brown-light border border-warm"}`}>
                                    Per {p}
                                  </button>
                                ))}
                              </div>

                              {calc && (
                                <div className="bg-sage-light/40 rounded-2xl p-3 text-center">
                                  <p className="text-2xl font-display text-sage font-bold">€{calc.amount.toFixed(2)}</p>
                                  <p className="text-xs text-brown-light mt-0.5">per {period} · over {calc.label}</p>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-brown-light italic">Stel een begin- en einddatum in om te berekenen hoeveel je per dag/week/maand moet sparen.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bedrag toevoegen */}
                  {!done && (
                    addingTo === goal.id ? (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Euro size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brown-light" />
                          <input value={addAmount} onChange={(e) => setAddAmount(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") addSavings(goal.id); if (e.key === "Escape") setAddingTo(null); }}
                            type="number" min="0.01" step="0.01" placeholder="Bedrag" autoFocus
                            className="w-full bg-warm rounded-xl border border-warm pl-7 pr-3 py-1.5 text-sm text-brown focus:outline-none focus:border-sage" />
                        </div>
                        <button onClick={() => addSavings(goal.id)} className="bg-sage text-cream px-4 rounded-xl text-sm font-semibold hover:bg-sage/80">Toevoegen</button>
                        <button onClick={() => setAddingTo(null)} className="bg-warm text-brown-light px-3 rounded-xl text-sm">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setAddingTo(goal.id)} className="flex items-center gap-2 text-sm text-terracotta font-semibold hover:text-terracotta/70 transition-colors">
                        <Plus size={14} /> Bedrag toevoegen
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── OVERZICHT TAB ── */}
      {tab === "overzicht" && (
        <div className="flex flex-col gap-5">
          {/* Kaartjes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-cream rounded-3xl p-5 border border-warm">
              <p className="text-xs text-brown-light mb-1">Totaal gespaard</p>
              <p className="font-display text-2xl text-sage">€{allSaved.toFixed(2)}</p>
              <p className="text-xs text-brown-light mt-1">van €{allTarget.toFixed(2)}</p>
            </div>
            <div className="bg-cream rounded-3xl p-5 border border-warm">
              <p className="text-xs text-brown-light mb-1">Actieve doelen</p>
              <p className="font-display text-2xl text-terracotta">{goals.filter((g) => totalSaved(g) < g.target).length}</p>
              <p className="text-xs text-brown-light mt-1">{goals.filter((g) => totalSaved(g) >= g.target).length} bereikt 🎉</p>
            </div>
          </div>

          {/* Grafiek */}
          <div className="bg-cream rounded-3xl p-5 border border-warm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-sage" />
              <p className="font-semibold text-brown text-sm">Gespaard per maand</p>
            </div>
            {monthlyData.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-4xl mb-2">📊</p>
                <p className="font-handwriting text-lg text-brown-light">Nog geen stortingen</p>
                <p className="text-xs text-brown-light mt-1">Voeg een bedrag toe aan een doel om de grafiek te zien</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} barSize={32}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9a7060" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9a7060" }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} />
                  <Tooltip
                    formatter={(value) => [`€${Number(value).toFixed(2)}`, "Gespaard"]}
                    contentStyle={{ background: "#fdf6f0", border: "1px solid #e8d5c4", borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                    {monthlyData.map((_, i) => (
                      <Cell key={i} fill={i === monthlyData.length - 1 ? "#c47b5a" : "#a8c5a0"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Per doel */}
          <div className="bg-cream rounded-3xl p-5 border border-warm">
            <p className="font-semibold text-brown text-sm mb-4">Per doel</p>
            {goals.length === 0 ? (
              <p className="text-brown-light text-sm">Nog geen doelen aangemaakt.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {goals.map((goal) => {
                  const saved = totalSaved(goal);
                  const pct = Math.min(goal.target > 0 ? Math.round((saved / goal.target) * 100) : 0, 100);
                  const done = saved >= goal.target;
                  return (
                    <div key={goal.id}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-brown">{goal.emoji} {goal.name}</span>
                        <span className="text-xs text-brown-light font-semibold">€{saved.toFixed(2)} / €{goal.target.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-warm rounded-full h-2 overflow-hidden">
                        <div className={`h-2 rounded-full transition-all duration-700 ${done ? "bg-sage" : "bg-terracotta"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-brown-light mt-0.5 text-right">{pct}%</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

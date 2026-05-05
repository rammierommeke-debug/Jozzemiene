"use client";

import { useState, useEffect } from "react";
import { PiggyBank, Plus, Trash2, Euro, TrendingUp, Check, CalendarDays, ChevronDown, ChevronUp, LayoutList, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { format, parseISO, differenceInDays, differenceInWeeks, differenceInCalendarMonths } from "date-fns";
import { nl } from "date-fns/locale";

type Entry = { id: string; goal_id: string; amount: number; date: string };
type Subcategory = { id: string; goal_id: string; name: string; emoji: string; target: number };
type MonthCheck = { id: string; goal_id: string; person: string; month: string; amount: number; entry_id: string };
type Goal = {
  id: string;
  name: string;
  emoji: string;
  target: number;
  date_from: string;
  date_to: string;
  emma_monthly: number | null;
  roel_monthly: number | null;
  savings_entries: Entry[];
  savings_subcategories: Subcategory[];
  savings_monthly_checks: MonthCheck[];
};
type Period = "dag" | "week" | "maand";

const SUB_COLORS = ["#c47b5a", "#a8c5a0", "#7b9e87", "#e8b4a0", "#9b8ea8", "#d4a96a", "#8ab5c8", "#c9a882"];
const MONTHS_TO_SHOW = 4;

function totalSaved(goal: Goal) {
  return goal.savings_entries.reduce((s, e) => s + e.amount, 0);
}

function calcPeriod(goal: Goal, period: Period) {
  if (!goal.date_from || !goal.date_to) return null;
  const from = parseISO(goal.date_from);
  const to = parseISO(goal.date_to);
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
    g.savings_entries.forEach((e) => {
      const key = format(parseISO(e.date), "MMM yy", { locale: nl });
      map[key] = (map[key] ?? 0) + e.amount;
    })
  );
  return Object.entries(map).slice(-6).map(([month, amount]) => ({ month, amount }));
}

function getRecentMonths(): string[] {
  const now = new Date();
  return Array.from({ length: MONTHS_TO_SHOW }, (_, i) =>
    format(new Date(now.getFullYear(), now.getMonth() + i, 1), "yyyy-MM")
  );
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return format(new Date(parseInt(y), parseInt(mo) - 1), "MMMM yyyy", { locale: nl });
}

export default function SparenPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tab, setTab] = useState<"doelen" | "overzicht">("doelen");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [target, setTarget] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [periods, setPeriods] = useState<Record<string, Period>>({});
  const [subExpandedId, setSubExpandedId] = useState<string | null>(null);
  const [bijdragenExpandedId, setBijdragenExpandedId] = useState<string | null>(null);

  const [subName, setSubName] = useState("");
  const [subEmoji, setSubEmoji] = useState("📌");
  const [subTarget, setSubTarget] = useState("");

  const [editingMonthly, setEditingMonthly] = useState<string | null>(null);
  const [emmaInput, setEmmaInput] = useState("");
  const [roelInput, setRoelInput] = useState("");

  // Editing check amounts: key = checkId, value = input string
  const [editingCheck, setEditingCheck] = useState<string | null>(null);
  const [editCheckAmount, setEditCheckAmount] = useState("");

  // Editing total saved (manual correction entry)
  const [editingTotal, setEditingTotal] = useState<string | null>(null);
  const [editTotalAmount, setEditTotalAmount] = useState("");

  const currentMonth = format(new Date(), "yyyy-MM");
  const recentMonths = getRecentMonths();

  useEffect(() => {
    fetch("/api/savings/goals")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setGoals(data.map(g => ({
          ...g,
          savings_subcategories: g.savings_subcategories ?? [],
          savings_monthly_checks: g.savings_monthly_checks ?? [],
        })));
      })
      .catch(() => {});
  }, []);

  async function createGoal() {
    if (!name.trim() || !target) return;
    const res = await fetch("/api/savings/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), emoji, target: parseFloat(target), dateFrom, dateTo }),
    });
    if (res.ok) {
      const goal = await res.json();
      setGoals((prev) => [{ ...goal, savings_subcategories: [], savings_monthly_checks: [] }, ...prev]);
    }
    setName(""); setEmoji("🎯"); setTarget(""); setDateFrom(""); setDateTo(""); setShowForm(false);
  }

  async function addSavings(goalId: string) {
    const amount = parseFloat(addAmount);
    if (!amount || amount <= 0) return;
    const res = await fetch("/api/savings/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId, amount }),
    });
    if (res.ok) {
      const entry = await res.json();
      setGoals((prev) => prev.map((g) =>
        g.id === goalId ? { ...g, savings_entries: [...g.savings_entries, entry] } : g
      ));
    }
    setAddingTo(null); setAddAmount("");
  }

  async function updateDates(id: string, df: string, dt: string) {
    await fetch(`/api/savings/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateFrom: df, dateTo: dt }),
    });
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, date_from: df, date_to: dt } : g));
  }

  async function saveMonthlyAmounts(goalId: string, emma: number | null, roel: number | null) {
    await fetch(`/api/savings/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emmaMonthly: emma, roelMonthly: roel }),
    });
    setGoals((prev) => prev.map((g) => g.id === goalId ? { ...g, emma_monthly: emma, roel_monthly: roel } : g));
    setEditingMonthly(null);
  }

  async function toggleCheck(goal: Goal, person: string, month: string, amount: number) {
    const existing = goal.savings_monthly_checks.find(c => c.person === person && c.month === month);
    if (existing) {
      await fetch(`/api/savings/goals/${goal.id}/checks/${existing.id}`, { method: "DELETE" });
      setGoals((prev) => prev.map((g) =>
        g.id === goal.id ? {
          ...g,
          savings_monthly_checks: g.savings_monthly_checks.filter(c => c.id !== existing.id),
          savings_entries: g.savings_entries.filter(e => e.id !== existing.entry_id),
        } : g
      ));
    } else {
      const res = await fetch(`/api/savings/goals/${goal.id}/checks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person, month, amount }),
      });
      if (res.ok) {
        const { check, entry } = await res.json();
        setGoals((prev) => prev.map((g) =>
          g.id === goal.id ? {
            ...g,
            savings_monthly_checks: [...g.savings_monthly_checks, check],
            savings_entries: [...g.savings_entries, entry],
          } : g
        ));
      }
    }
  }

  async function updateCheckAmount(goal: Goal, check: MonthCheck, newAmount: number) {
    if (!newAmount || newAmount <= 0) return;
    await fetch(`/api/savings/entries/${check.entry_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: newAmount }),
    });
    setGoals(prev => prev.map(g =>
      g.id === goal.id ? {
        ...g,
        savings_monthly_checks: g.savings_monthly_checks.map(c =>
          c.id === check.id ? { ...c, amount: newAmount } : c
        ),
        savings_entries: g.savings_entries.map(e =>
          e.id === check.entry_id ? { ...e, amount: newAmount } : e
        ),
      } : g
    ));
    setEditingCheck(null);
  }

  async function updateTotalManually(goalId: string, newTotal: number) {
    if (newTotal < 0) return;
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const currentSaved = totalSaved(goal);
    const diff = newTotal - currentSaved;
    if (diff === 0) { setEditingTotal(null); return; }
    const res = await fetch("/api/savings/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId, amount: diff }),
    });
    if (res.ok) {
      const entry = await res.json();
      setGoals(prev => prev.map(g =>
        g.id === goalId ? { ...g, savings_entries: [...g.savings_entries, entry] } : g
      ));
    }
    setEditingTotal(null);
    setEditTotalAmount("");
  }

  async function deleteGoal(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await fetch(`/api/savings/goals/${id}`, { method: "DELETE" });
  }

  async function addSubcategory(goalId: string) {
    const t = parseFloat(subTarget);
    if (!subName.trim() || !t || t <= 0) return;
    const res = await fetch(`/api/savings/goals/${goalId}/subcategories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: subName.trim(), emoji: subEmoji, target: t }),
    });
    if (res.ok) {
      const sub = await res.json();
      setGoals((prev) => prev.map((g) =>
        g.id === goalId ? { ...g, savings_subcategories: [...g.savings_subcategories, sub] } : g
      ));
    }
    setSubName(""); setSubEmoji("📌"); setSubTarget("");
  }

  async function deleteSubcategory(goalId: string, subId: string) {
    await fetch(`/api/savings/goals/${goalId}/subcategories/${subId}`, { method: "DELETE" });
    setGoals((prev) => prev.map((g) =>
      g.id === goalId ? { ...g, savings_subcategories: g.savings_subcategories.filter(s => s.id !== subId) } : g
    ));
  }

  const allSaved = goals.reduce((s, g) => s + totalSaved(g), 0);
  const allTarget = goals.reduce((s, g) => s + g.target, 0);
  const monthlyData = buildMonthlyData(goals);

  return (
    <div className="max-w-2xl mx-auto pt-14 md:pt-0">
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

      <div className="flex gap-2 mb-6 bg-warm rounded-2xl p-1">
        {(["doelen", "overzicht"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? "bg-cream text-brown shadow-sm" : "text-brown-light hover:text-brown"}`}>
            {t === "doelen" ? "🎯 Doelen" : "📊 Overzicht"}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-sage-light/30 rounded-3xl p-6 border border-warm mb-6">
          <p className="font-semibold text-brown mb-4 text-sm">Nieuw spaardoel</p>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-12 bg-cream rounded-xl border border-warm text-center py-2 focus:outline-none focus:border-sage" maxLength={2} />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Naam (bv. Huis, Japan...)" className="flex-1 bg-cream rounded-xl border border-warm px-4 py-2 text-sm text-brown focus:outline-none focus:border-sage" />
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
              const subExpanded = subExpandedId === goal.id;
              const bijdragenExpanded = bijdragenExpandedId === goal.id;
              const subs = goal.savings_subcategories ?? [];
              const checks = goal.savings_monthly_checks ?? [];
              const subTotal = subs.reduce((s, c) => s + c.target, 0);
              const unallocated = Math.max(goal.target - subTotal, 0);

              const pieData = subs.length > 0
                ? [
                    ...subs.map((s) => ({ name: `${s.emoji} ${s.name}`, value: s.target })),
                    ...(unallocated > 0 ? [{ name: "Overig", value: unallocated }] : []),
                  ]
                : [];

              const emmaMonthly = goal.emma_monthly;
              const roelMonthly = goal.roel_monthly;
              const isEditing = editingMonthly === goal.id;

              return (
                <div key={goal.id} className={`bg-cream rounded-3xl p-5 border group ${done ? "border-sage/40 ring-2 ring-sage/20" : "border-warm"}`}>
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

                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-brown-light">Gespaard</span>
                    {editingTotal === goal.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-brown-light text-xs">€</span>
                        <input
                          value={editTotalAmount}
                          onChange={e => setEditTotalAmount(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") updateTotalManually(goal.id, parseFloat(editTotalAmount)); if (e.key === "Escape") setEditingTotal(null); }}
                          onBlur={() => { if (editTotalAmount) updateTotalManually(goal.id, parseFloat(editTotalAmount)); else setEditingTotal(null); }}
                          type="number" min="0" step="0.01" autoFocus
                          className="w-24 bg-warm rounded-lg border border-sage px-2 py-0.5 text-sm font-semibold text-brown focus:outline-none"
                        />
                        <span className="text-brown-light text-xs">/ €{goal.target.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span
                        onDoubleClick={() => { setEditingTotal(goal.id); setEditTotalAmount(saved.toFixed(2)); }}
                        className="font-semibold text-brown cursor-pointer hover:text-terracotta transition-colors select-none"
                        title="Dubbelklik om aan te passen"
                      >
                        €{saved.toFixed(2)} / €{goal.target.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-warm rounded-full h-2.5 overflow-hidden mb-1">
                    <div className={`h-2.5 rounded-full transition-all duration-700 ${done ? "bg-sage" : "bg-terracotta"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-brown-light mb-4">{pct}% · nog €{Math.max(goal.target - saved, 0).toFixed(2)} te gaan</p>

                  {/* Maandelijkse bijdragen */}
                  <div className="bg-warm rounded-2xl mb-3 overflow-hidden">
                    <button
                      onClick={() => setBijdragenExpandedId(bijdragenExpanded ? null : goal.id)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-brown"
                    >
                      <span className="flex items-center gap-2">
                        <Users size={14} className="text-purple-500" />
                        Maandelijkse bijdragen
                        {(emmaMonthly || roelMonthly) && (
                          <span className="text-xs font-normal text-brown-light">
                            Emma €{(emmaMonthly ?? 0).toFixed(0)} · Roel €{(roelMonthly ?? 0).toFixed(0)}/mnd
                          </span>
                        )}
                      </span>
                      {bijdragenExpanded ? <ChevronUp size={14} className="text-brown-light" /> : <ChevronDown size={14} className="text-brown-light" />}
                    </button>

                    {bijdragenExpanded && (
                      <div className="px-4 pb-4 flex flex-col gap-4">
                        {/* Bedragen instellen */}
                        {isEditing ? (
                          <div className="flex flex-col gap-2">
                            <p className="text-xs text-brown-light font-semibold uppercase tracking-wide">Maandelijks bedrag per persoon</p>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="text-xs text-green-700 font-semibold mb-1 block">Emma</label>
                                <div className="relative">
                                  <Euro size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brown-light" />
                                  <input value={emmaInput} onChange={e => setEmmaInput(e.target.value)} type="number" min="0" placeholder="0"
                                    className="w-full bg-cream rounded-xl border border-green-200 pl-7 pr-3 py-1.5 text-sm text-brown focus:outline-none focus:border-green-400" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <label className="text-xs text-purple-700 font-semibold mb-1 block">Roel</label>
                                <div className="relative">
                                  <Euro size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brown-light" />
                                  <input value={roelInput} onChange={e => setRoelInput(e.target.value)} type="number" min="0" placeholder="0"
                                    className="w-full bg-cream rounded-xl border border-purple-200 pl-7 pr-3 py-1.5 text-sm text-brown focus:outline-none focus:border-purple-400" />
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => saveMonthlyAmounts(goal.id, parseFloat(emmaInput) || null, parseFloat(roelInput) || null)}
                                className="flex-1 bg-sage text-cream rounded-xl py-1.5 text-xs font-semibold hover:bg-sage/80 transition-colors">
                                Opslaan
                              </button>
                              <button onClick={() => setEditingMonthly(null)}
                                className="flex-1 bg-warm text-brown-light rounded-xl py-1.5 text-xs hover:bg-warm/80 transition-colors">
                                Annuleren
                              </button>
                            </div>
                          </div>
                        ) : (emmaMonthly || roelMonthly) ? (
                          <div className="flex items-center justify-between">
                            <div className="flex gap-3">
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">Emma €{(emmaMonthly ?? 0).toFixed(0)}/mnd</span>
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-semibold">Roel €{(roelMonthly ?? 0).toFixed(0)}/mnd</span>
                            </div>
                            <button onClick={() => { setEditingMonthly(goal.id); setEmmaInput((emmaMonthly ?? "").toString()); setRoelInput((roelMonthly ?? "").toString()); }}
                              className="text-xs text-brown-light hover:text-brown transition-colors">Aanpassen</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingMonthly(goal.id); setEmmaInput(""); setRoelInput(""); }}
                            className="flex items-center gap-1.5 text-xs text-brown-light hover:text-brown transition-colors">
                            <Plus size={12} /> Maandelijkse bedragen instellen
                          </button>
                        )}

                        {/* Maand checklist */}
                        {(emmaMonthly || roelMonthly) && (
                          <div className="flex flex-col gap-2">
                            {recentMonths.map((month, idx) => {
                              const isCurrentMonth = month === currentMonth;
                              const emmaCheck = checks.find(c => c.person === "Emma" && c.month === month);
                              const roelCheck = checks.find(c => c.person === "Roel" && c.month === month);
                              const label = monthLabel(month);
                              return (
                                <div key={month} className={`rounded-2xl px-3 py-2.5 ${isCurrentMonth ? "bg-cream border-2 border-sage/30" : "bg-cream/60"}`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className={`text-xs font-semibold capitalize ${isCurrentMonth ? "text-brown" : "text-brown-light"}`}>
                                      {isCurrentMonth && <span className="inline-block w-1.5 h-1.5 rounded-full bg-sage mr-1.5 mb-0.5" />}
                                      {label}
                                    </span>
                                    {isCurrentMonth && <span className="text-[10px] text-sage font-semibold bg-sage/10 px-2 py-0.5 rounded-full">Deze maand</span>}
                                  </div>
                                  <div className="flex gap-2">
                                    {emmaMonthly && (
                                      <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all
                                        ${emmaCheck ? 'bg-green-100 text-green-800 border-green-200' : 'bg-warm text-brown-light border-warm'}">
                                        <button onClick={() => toggleCheck(goal, "Emma", month, emmaMonthly)} className="flex items-center gap-1.5 shrink-0">
                                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${emmaCheck ? "bg-green-400 border-green-400" : "border-current"}`}>
                                            {emmaCheck && <Check size={9} className="text-white" />}
                                          </span>
                                          Emma ·
                                        </button>
                                        {emmaCheck && editingCheck === emmaCheck.id ? (
                                          <input value={editCheckAmount} onChange={e => setEditCheckAmount(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") updateCheckAmount(goal, emmaCheck, parseFloat(editCheckAmount)); if (e.key === "Escape") setEditingCheck(null); }}
                                            onBlur={() => { if (editCheckAmount) updateCheckAmount(goal, emmaCheck, parseFloat(editCheckAmount)); else setEditingCheck(null); }}
                                            type="number" min="0.01" autoFocus
                                            className="w-14 bg-cream rounded border border-green-300 px-1 py-0 text-xs text-brown focus:outline-none" />
                                        ) : (
                                          <span
                                            onDoubleClick={emmaCheck ? () => { setEditingCheck(emmaCheck.id); setEditCheckAmount((goal.savings_entries.find(e => e.id === emmaCheck.entry_id)?.amount ?? emmaMonthly).toString()); } : undefined}
                                            className={emmaCheck ? "cursor-pointer hover:text-green-900 select-none" : ""}
                                            title={emmaCheck ? "Dubbelklik om aan te passen" : undefined}
                                          >
                                            €{emmaCheck ? (goal.savings_entries.find(e => e.id === emmaCheck.entry_id)?.amount ?? emmaMonthly).toFixed(0) : emmaMonthly.toFixed(0)}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {roelMonthly && (
                                      <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all
                                        ${roelCheck ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-warm text-brown-light border-warm'}">
                                        <button onClick={() => toggleCheck(goal, "Roel", month, roelMonthly)} className="flex items-center gap-1.5 shrink-0">
                                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${roelCheck ? "bg-purple-400 border-purple-400" : "border-current"}`}>
                                            {roelCheck && <Check size={9} className="text-white" />}
                                          </span>
                                          Roel ·
                                        </button>
                                        {roelCheck && editingCheck === roelCheck.id ? (
                                          <input value={editCheckAmount} onChange={e => setEditCheckAmount(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") updateCheckAmount(goal, roelCheck, parseFloat(editCheckAmount)); if (e.key === "Escape") setEditingCheck(null); }}
                                            onBlur={() => { if (editCheckAmount) updateCheckAmount(goal, roelCheck, parseFloat(editCheckAmount)); else setEditingCheck(null); }}
                                            type="number" min="0.01" autoFocus
                                            className="w-14 bg-cream rounded border border-purple-300 px-1 py-0 text-xs text-brown focus:outline-none" />
                                        ) : (
                                          <span
                                            onDoubleClick={roelCheck ? () => { setEditingCheck(roelCheck.id); setEditCheckAmount((goal.savings_entries.find(e => e.id === roelCheck.entry_id)?.amount ?? roelMonthly).toString()); } : undefined}
                                            className={roelCheck ? "cursor-pointer hover:text-purple-900 select-none" : ""}
                                            title={roelCheck ? "Dubbelklik om aan te passen" : undefined}
                                          >
                                            €{roelCheck ? (goal.savings_entries.find(e => e.id === roelCheck.entry_id)?.amount ?? roelMonthly).toFixed(0) : roelMonthly.toFixed(0)}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Onderverdeling */}
                  <div className="bg-warm rounded-2xl mb-3 overflow-hidden">
                    <button
                      onClick={() => setSubExpandedId(subExpanded ? null : goal.id)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-brown"
                    >
                      <span className="flex items-center gap-2">
                        <LayoutList size={14} className="text-terracotta" />
                        Onderverdeling
                        {subs.length > 0 && <span className="text-xs font-normal text-brown-light">{subs.length} categorie{subs.length > 1 ? "ën" : ""}</span>}
                      </span>
                      {subExpanded ? <ChevronUp size={14} className="text-brown-light" /> : <ChevronDown size={14} className="text-brown-light" />}
                    </button>

                    {subExpanded && (
                      <div className="px-4 pb-4 flex flex-col gap-4">
                        {subs.length > 0 && (
                          <>
                            <div className="flex flex-col items-center">
                              <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                                    {pieData.map((_, i) => (
                                      <Cell key={i} fill={SUB_COLORS[i % SUB_COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(value) => [`€${Number(value).toFixed(2)}`, ""]}
                                    contentStyle={{ background: "#fdf6f0", border: "1px solid #e8d5c4", borderRadius: 12, fontSize: 12 }} />
                                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="flex flex-col gap-2">
                              {subs.map((sub, i) => {
                                const subPct = Math.round((sub.target / goal.target) * 100);
                                return (
                                  <div key={sub.id} className="flex items-center gap-2 group/sub">
                                    <span className="text-base w-6 text-center shrink-0">{sub.emoji}</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-center mb-0.5">
                                        <span className="text-xs font-semibold text-brown truncate">{sub.name}</span>
                                        <span className="text-xs text-brown-light shrink-0 ml-2">€{sub.target.toFixed(2)} · {subPct}%</span>
                                      </div>
                                      <div className="w-full bg-cream rounded-full h-1.5 overflow-hidden">
                                        <div className="h-1.5 rounded-full" style={{ width: `${subPct}%`, backgroundColor: SUB_COLORS[i % SUB_COLORS.length] }} />
                                      </div>
                                    </div>
                                    <button onClick={() => deleteSubcategory(goal.id, sub.id)} className="opacity-0 group-hover/sub:opacity-100 text-rose/50 hover:text-rose transition-all shrink-0">
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                );
                              })}
                              {unallocated > 0 && (
                                <p className="text-xs text-brown-light italic pl-8">+ €{unallocated.toFixed(2)} nog niet ingedeeld</p>
                              )}
                            </div>
                          </>
                        )}
                        <div className="border-t border-warm/60 pt-3">
                          <p className="text-xs text-brown-light mb-2 font-semibold uppercase tracking-wide">Categorie toevoegen</p>
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <input value={subEmoji} onChange={(e) => setSubEmoji(e.target.value)} maxLength={2}
                                className="w-10 bg-cream rounded-xl border border-warm text-center py-1.5 text-sm focus:outline-none focus:border-sage shrink-0" />
                              <input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="bv. Accommodatie"
                                className="flex-1 bg-cream rounded-xl border border-warm px-3 py-1.5 text-sm text-brown focus:outline-none focus:border-sage" />
                            </div>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Euro size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brown-light" />
                                <input value={subTarget} onChange={(e) => setSubTarget(e.target.value)} type="number" min="1" placeholder="Budget"
                                  className="w-full bg-cream rounded-xl border border-warm pl-7 pr-3 py-1.5 text-sm text-brown focus:outline-none focus:border-sage" />
                              </div>
                              <button onClick={() => addSubcategory(goal.id)} disabled={!subName.trim() || !subTarget}
                                className="bg-terracotta text-cream px-3 rounded-xl text-sm font-semibold hover:bg-terracotta/80 disabled:opacity-40 transition-colors">
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Spaarplan */}
                  {!done && (
                    <div className="bg-warm rounded-2xl mb-3 overflow-hidden">
                      <button
                        onClick={() => setExpandedId(expanded ? null : goal.id)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-brown"
                      >
                        <span className="flex items-center gap-2"><CalendarDays size={14} className="text-sage" /> Spaarplan</span>
                        {expanded ? <ChevronUp size={14} className="text-brown-light" /> : <ChevronDown size={14} className="text-brown-light" />}
                      </button>
                      {expanded && (
                        <div className="px-4 pb-4 flex flex-col gap-3">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-xs text-brown-light mb-1 block">Van</label>
                              <input type="date" defaultValue={goal.date_from}
                                onBlur={(e) => updateDates(goal.id, e.target.value, goal.date_to)}
                                className="w-full bg-cream rounded-xl border border-warm px-2 py-1.5 text-xs text-brown focus:outline-none focus:border-sage" />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-brown-light mb-1 block">Tot</label>
                              <input type="date" defaultValue={goal.date_to}
                                onBlur={(e) => updateDates(goal.id, goal.date_from, e.target.value)}
                                className="w-full bg-cream rounded-xl border border-warm px-2 py-1.5 text-xs text-brown focus:outline-none focus:border-sage" />
                            </div>
                          </div>
                          {goal.date_from && goal.date_to ? (
                            <>
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

      {tab === "overzicht" && (
        <div className="flex flex-col gap-5">
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
                  <Tooltip formatter={(value) => [`€${Number(value).toFixed(2)}`, "Gespaard"]}
                    contentStyle={{ background: "#fdf6f0", border: "1px solid #e8d5c4", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                    {monthlyData.map((_, i) => (
                      <Cell key={i} fill={i === monthlyData.length - 1 ? "#c47b5a" : "#a8c5a0"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

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
                  const subs = goal.savings_subcategories ?? [];
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
                      {subs.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {subs.map((sub, i) => (
                            <span key={sub.id} className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: SUB_COLORS[i % SUB_COLORS.length] + "33", color: SUB_COLORS[i % SUB_COLORS.length] }}>
                              {sub.emoji} {sub.name} · €{sub.target.toFixed(0)}
                            </span>
                          ))}
                        </div>
                      )}
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

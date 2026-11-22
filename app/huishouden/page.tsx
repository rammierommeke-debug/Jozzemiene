"use client";

import { useState, useEffect, useMemo } from "react";
import { Sparkles, Plus, Trash2, Check, Pencil, X, Undo2, CalendarClock } from "lucide-react";
import { addDays, differenceInCalendarDays, format, startOfWeek } from "date-fns";
import { nl } from "date-fns/locale";

// Opgeslagen in custom_entries (slug "huishouden"), veld `data`.
type Done = { at: string; by?: string };
type Chore = {
  title: string;
  room: string;
  every: number; // aantal dagen tussen keren
  who?: string; // roel | emma | samen (wiens taak)
  history: Done[]; // nieuwste eerst
};
type Entry = { id: string; data: Chore; created_at: string };

const SLUG = "huishouden";

const ROOMS: { key: string; label: string; emoji: string }[] = [
  { key: "keuken", label: "Keuken", emoji: "🍳" },
  { key: "badkamer", label: "Badkamer", emoji: "🛁" },
  { key: "woonkamer", label: "Woonkamer", emoji: "🛋️" },
  { key: "slaapkamer", label: "Slaapkamer", emoji: "🛏️" },
  { key: "was", label: "Was", emoji: "🧺" },
  { key: "buiten", label: "Buiten", emoji: "🌿" },
  { key: "garage", label: "Garage", emoji: "🚗" },
  { key: "boven", label: "Boven", emoji: "⬆️" },
  { key: "beneden", label: "Beneden", emoji: "⬇️" },
  { key: "overig", label: "Overig", emoji: "🏠" },
];
const roomOf = (k: string) => ROOMS.find((r) => r.key === k) ?? ROOMS[ROOMS.length - 1];

const FREQS: { days: number; label: string }[] = [
  { days: 1, label: "Elke dag" },
  { days: 3, label: "2× per week" },
  { days: 7, label: "Wekelijks" },
  { days: 14, label: "Om de 2 weken" },
  { days: 30, label: "Maandelijks" },
  { days: 90, label: "Om de 3 maanden" },
];
// Groepen voor filter / onderverdeling
const FREQ_GROUPS: { key: string; label: string; match: (d: number) => boolean }[] = [
  { key: "dag", label: "Dagelijks", match: (d) => d <= 1 },
  { key: "week", label: "Wekelijks", match: (d) => d > 1 && d <= 7 },
  { key: "2week", label: "Om de 2 weken", match: (d) => d > 7 && d <= 14 },
  { key: "maand", label: "Maandelijks", match: (d) => d > 14 && d <= 31 },
  { key: "zelden", label: "Om de paar maanden", match: (d) => d > 31 },
];
const groupOf = (d: number) => FREQ_GROUPS.find((g) => g.match(d)) ?? FREQ_GROUPS[FREQ_GROUPS.length - 1];
const freqLabel = (d: number) => FREQS.find((f) => f.days === d)?.label ?? `Elke ${d} dagen`;

const STARTERS: { title: string; room: string; every: number }[] = [
  { title: "Afwas / vaatwasser", room: "keuken", every: 1 },
  { title: "Aanrecht & fornuis afnemen", room: "keuken", every: 3 },
  { title: "Koelkast opruimen", room: "keuken", every: 14 },
  { title: "Toilet poetsen", room: "badkamer", every: 7 },
  { title: "Douche & lavabo", room: "badkamer", every: 7 },
  { title: "Stofzuigen", room: "woonkamer", every: 7 },
  { title: "Dweilen", room: "woonkamer", every: 14 },
  { title: "Afstoffen", room: "woonkamer", every: 14 },
  { title: "Bed verschonen", room: "slaapkamer", every: 14 },
  { title: "Was draaien", room: "was", every: 3 },
  { title: "Vuilnis buiten zetten", room: "buiten", every: 7 },
  { title: "Planten water geven", room: "overig", every: 7 },
  { title: "Steelstofzuiger uitkuisen", room: "overig", every: 30 },
  { title: "Robotstofzuiger uitkuisen", room: "overig", every: 30 },
  { title: "Zout aanvullen", room: "keuken", every: 90 },
];

const WHO: { key: string; label: string; cls: string }[] = [
  { key: "samen", label: "Samen", cls: "bg-rose-light/50 text-rose border-rose-light" },
  { key: "roel", label: "Roel", cls: "bg-terracotta/15 text-terracotta border-terracotta/30" },
  { key: "emma", label: "Emma", cls: "bg-sage-light/50 text-sage border-sage-light" },
];
const whoOf = (k?: string) => WHO.find((w) => w.key === k) ?? WHO[0];

const emptyForm = { title: "", room: "keuken", every: 7, who: "samen" };

type Tone = "late" | "today" | "soon" | "ok" | "new";
type Status = { daysLeft: number | null; next: Date | null; label: string; tone: Tone };

function statusOf(c: Chore, today: Date): Status {
  const last = c.history[0];
  if (!last) return { daysLeft: null, next: null, label: "Nog nooit gedaan", tone: "new" };
  const next = addDays(new Date(last.at), c.every);
  const left = differenceInCalendarDays(next, today);
  if (left < 0) return { daysLeft: left, next, label: `${-left} ${-left === 1 ? "dag" : "dagen"} te laat`, tone: "late" };
  if (left === 0) return { daysLeft: 0, next, label: "Vandaag", tone: "today" };
  if (left === 1) return { daysLeft: 1, next, label: "Morgen", tone: "soon" };
  return { daysLeft: left, next, label: countdown(left), tone: left <= 2 ? "soon" : "ok" };
}

function countdown(days: number): string {
  if (days < 14) return `Over ${days} dagen`;
  if (days < 60) return `Over ${Math.round(days / 7)} weken`;
  return `Over ${Math.round(days / 30)} maanden`;
}

function agoLabel(at: string): string {
  const d = differenceInCalendarDays(new Date(), new Date(at));
  if (d <= 0) return "Vandaag";
  if (d === 1) return "Gisteren";
  if (d < 14) return `${d} dagen geleden`;
  if (d < 60) return `${Math.round(d / 7)} weken geleden`;
  return `${Math.round(d / 30)} maanden geleden`;
}

const TONE: Record<Tone, string> = {
  late: "bg-rose/15 text-rose",
  today: "bg-terracotta/15 text-terracotta",
  soon: "bg-terracotta-light/20 text-terracotta",
  ok: "bg-sage-light/40 text-sage",
  new: "bg-warm text-brown-light",
};
const NEXT_TEXT: Record<Tone, string> = {
  late: "text-rose", today: "text-terracotta", soon: "text-terracotta", ok: "text-sage", new: "text-brown-light",
};
const BAR: Record<Tone, string> = {
  late: "bg-rose", today: "bg-terracotta", soon: "bg-terracotta-light", ok: "bg-sage", new: "bg-warm",
};

export default function HuishoudenPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [view, setView] = useState<"todo" | "freq" | "ruimte">("todo");
  const [freq, setFreq] = useState<string>("alles");
  const [busy, setBusy] = useState(false);
  const [person, setPerson] = useState<"alles" | "roel" | "emma">("alles");

  const today = new Date();

  useEffect(() => {
    fetch(`/api/custom/${SLUG}`)
      .then((r) => r.json())
      .then((d) => setEntries(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  async function create(chore: Chore) {
    const res = await fetch(`/api/custom/${SLUG}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: chore }),
    });
    if (!res.ok) return null;
    return (await res.json()) as Entry;
  }

  async function save(id: string, chore: Chore) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, data: chore } : e)));
    await fetch(`/api/custom/${SLUG}/entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: chore }),
    });
  }

  async function submitForm() {
    if (!form.title.trim()) return;
    if (editId) {
      const cur = entries.find((e) => e.id === editId);
      if (cur) await save(editId, { ...cur.data, ...form, title: form.title.trim() });
    } else {
      const created = await create({ ...form, title: form.title.trim(), history: [] });
      if (created) setEntries((prev) => [...prev, created]);
    }
    closeForm();
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
    setForm({ ...emptyForm });
  }

  function startEdit(e: Entry) {
    setEditId(e.id);
    setForm({ title: e.data.title, room: e.data.room, every: e.data.every, who: whoOf(e.data.who).key });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function markDone(e: Entry) {
    const history = [{ at: new Date().toISOString() }, ...(e.data.history ?? [])].slice(0, 30);
    await save(e.id, { ...e.data, history });
  }

  async function undoDone(e: Entry) {
    await save(e.id, { ...e.data, history: (e.data.history ?? []).slice(1) });
  }

  async function remove(id: string) {
    if (!confirm("Dit klusje verwijderen?")) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/custom/${SLUG}/entries/${id}`, { method: "DELETE" });
  }

  async function addStarters() {
    setBusy(true);
    const existing = new Set(entries.map((e) => e.data.title.toLowerCase()));
    const added: Entry[] = [];
    for (const s of STARTERS) {
      if (existing.has(s.title.toLowerCase())) continue;
      const c = await create({ ...s, history: [] });
      if (c) added.push(c);
    }
    setEntries((prev) => [...prev, ...added]);
    setBusy(false);
  }

  const items = useMemo(
    () =>
      entries
        .filter((e) => freq === "alles" || groupOf(e.data.every).key === freq)
        .filter((e) => person === "alles" || whoOf(e.data.who).key === person || whoOf(e.data.who).key === "samen")
        .map((e) => ({ e, s: statusOf({ ...e.data, history: e.data.history ?? [] }, today) }))
        .sort((a, b) => (a.s.daysLeft ?? -999) - (b.s.daysLeft ?? -999)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, person, freq]
  );

  const todo = items.filter((i) => i.s.tone === "late" || i.s.tone === "today" || i.s.tone === "new");
  const later = items.filter((i) => !todo.includes(i));

  // Aantal keer afgevinkt deze week (maandag t/m zondag)
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  let doneWeek = 0;
  for (const { e } of items) for (const h of e.data.history ?? []) if (new Date(h.at) >= weekStart) doneWeek++;

  const row = ({ e, s }: { e: Entry; s: Status }) => (
    <ChoreRow key={e.id} entry={e} status={s} onDone={markDone} onUndo={undoDone} onEdit={startEdit} onDelete={remove} />
  );

  return (
    <div className="max-w-2xl mx-auto pt-14 md:pt-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Sparkles className="text-terracotta" size={28} />
          <h1 className="font-display text-3xl text-brown">Huishouden</h1>
        </div>
        <button
          onClick={() => (showForm ? closeForm() : setShowForm(true))}
          className="flex items-center gap-2 bg-terracotta text-cream px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-terracotta/80 transition-colors"
        >
          <Plus size={16} /> Klusje
        </button>
      </div>

      {/* Stats */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-rose-light/30 rounded-2xl p-4 text-center border border-warm">
            <p className="font-display text-2xl text-rose">{todo.length}</p>
            <p className="text-xs text-brown-light">Nu te doen</p>
          </div>
          <div className="bg-sage-light/30 rounded-2xl p-4 text-center border border-warm">
            <p className="font-display text-2xl text-sage">{doneWeek}</p>
            <p className="text-xs text-brown-light">Gedaan deze week</p>
          </div>
          <div className="bg-warm rounded-2xl p-4 text-center border border-warm">
            <p className="font-display text-2xl text-brown">{entries.length}</p>
            <p className="text-xs text-brown-light">Klusjes</p>
          </div>
        </div>
      )}

      {/* Formulier */}
      {showForm && (
        <div className="bg-warm rounded-3xl p-5 border border-warm mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-brown text-sm">{editId ? "Klusje aanpassen" : "Nieuw klusje"}</p>
            <button onClick={closeForm} className="text-brown-light hover:text-brown"><X size={16} /></button>
          </div>
          <div className="flex flex-col gap-3">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && submitForm()}
              placeholder="Bv. ramen lappen"
              autoFocus
              className="bg-cream rounded-xl border border-warm px-4 py-2 text-sm text-brown focus:outline-none focus:border-terracotta"
            />
            <Picker label="Ruimte" value={form.room} onChange={(room) => setForm({ ...form, room })}
              options={ROOMS.map((r) => ({ key: r.key, label: `${r.emoji} ${r.label}` }))} />
            <Picker label="Van wie" value={form.who} onChange={(who) => setForm({ ...form, who })}
              options={WHO.map((w) => ({ key: w.key, label: w.label }))} />
            <Picker label="Hoe vaak" value={String(form.every)} onChange={(v) => setForm({ ...form, every: Number(v) })}
              options={FREQS.map((f) => ({ key: String(f.days), label: f.label }))} />
            <div className="flex gap-2 mt-1">
              <button onClick={submitForm} className="flex-1 bg-terracotta text-cream rounded-xl py-2 text-sm font-semibold hover:bg-terracotta/80">
                {editId ? "Opslaan" : "Toevoegen"}
              </button>
              <button onClick={closeForm} className="flex-1 bg-cream text-brown-light rounded-xl py-2 text-sm hover:bg-warm">Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-brown-light text-sm text-center mt-10">Laden...</p>
      ) : entries.length === 0 ? (
        <div className="text-center mt-16">
          <p className="font-handwriting text-2xl text-brown-light">Nog geen klusjes 🧽</p>
          <p className="text-sm text-brown-light mt-1 mb-5">Voeg er zelf toe, of begin met een standaardlijstje.</p>
          <button
            onClick={addStarters}
            disabled={busy}
            className="bg-sage text-cream px-5 py-2.5 rounded-2xl text-sm font-semibold hover:bg-sage/80 disabled:opacity-50"
          >
            {busy ? "Even geduld..." : "Standaardklusjes toevoegen"}
          </button>
        </div>
      ) : (
        <>
          {/* Weergave-keuze */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <div className="flex gap-1.5">
            {([["todo", "Planning"], ["freq", "Per frequentie"], ["ruimte", "Per ruimte"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setView(k)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  view === k ? "bg-brown text-cream" : "bg-warm text-brown-light hover:text-brown"
                }`}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {([["alles", "Iedereen"], ["roel", "Roel"], ["emma", "Emma"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setPerson(k)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  person === k ? "bg-terracotta text-cream" : "bg-warm text-brown-light hover:text-brown"
                }`}>
                {l}
              </button>
            ))}
          </div>
          </div>

          {/* Filter op frequentie */}
          <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {[{ key: "alles", label: "Alles" }, ...FREQ_GROUPS].map((g) => {
              const n = g.key === "alles" ? entries.length : entries.filter((e) => groupOf(e.data.every).key === g.key).length;
              if (g.key !== "alles" && n === 0) return null;
              return (
                <button key={g.key} onClick={() => setFreq(g.key)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                    freq === g.key ? "bg-sage text-cream border-sage" : "bg-cream text-brown border-warm hover:bg-warm"
                  }`}>
                  {g.label} <span className="opacity-70">({n})</span>
                </button>
              );
            })}
          </div>

          {items.length === 0 ? (
            <p className="text-brown-light text-center py-8">Geen klusjes voor deze filter.</p>
          ) : view === "freq" ? (
            <div className="flex flex-col gap-6">
              {FREQ_GROUPS.map((g) => {
                const list = items.filter((i) => groupOf(i.e.data.every).key === g.key);
                if (list.length === 0) return null;
                return (
                  <Section key={g.key} title={g.label} count={list.length}>
                    {list.map(row)}
                  </Section>
                );
              })}
            </div>
          ) : view === "todo" ? (
            <div className="flex flex-col gap-6">
              <Section title="Nu te doen" count={todo.length}>
                {todo.length === 0 ? (
                  <p className="font-handwriting text-xl text-sage text-center py-4">Alles is bij! ✨</p>
                ) : (
                  todo.map(row)
                )}
              </Section>
              {later.length > 0 && (
                <Section title="Gepland" count={later.length}>
                  {later.map(row)}
                </Section>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {ROOMS.map((r) => {
                const list = items.filter((i) => roomOf(i.e.data.room).key === r.key);
                if (list.length === 0) return null;
                return (
                  <Section key={r.key} title={`${r.emoji} ${r.label}`} count={list.length}>
                    {list.map(row)}
                  </Section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Picker({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { key: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-xs text-brown-light mb-1">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o.key} onClick={() => onChange(o.key)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
              value === o.key ? "bg-brown text-cream" : "bg-cream text-brown-light hover:bg-cream/70"
            }`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-sm font-bold text-brown-light uppercase tracking-wide">{title}</p>
        <span className="text-sm text-brown-light">({count})</span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function ChoreRow({ entry, status, onDone, onUndo, onEdit, onDelete }: {
  entry: Entry; status: Status;
  onDone: (e: Entry) => void; onUndo: (e: Entry) => void; onEdit: (e: Entry) => void; onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const c = entry.data;
  const room = roomOf(c.room);
  const history = c.history ?? [];
  const last = history[0];
  const doneToday = !!last && differenceInCalendarDays(new Date(), new Date(last.at)) === 0;
  const elapsed = last ? differenceInCalendarDays(new Date(), new Date(last.at)) : 0;
  const pct = last ? Math.min(100, Math.max(3, (elapsed / c.every) * 100)) : 100;

  return (
    <div className={`bg-cream rounded-2xl px-4 py-3 border group ${status.tone === "late" ? "border-rose/40" : "border-warm"}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => (doneToday ? onUndo(entry) : onDone(entry))}
          title={doneToday ? "Ongedaan maken" : "Gedaan!"}
          className={`shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${
            doneToday ? "bg-sage border-sage text-cream" : "border-warm text-brown-light hover:border-sage hover:text-sage"
          }`}
        >
          <Check size={16} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg leading-none">{room.emoji}</span>
            <p className="text-base font-semibold text-brown">{c.title}</p>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${TONE[status.tone]}`}>{status.label}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-sm px-2.5 py-0.5 rounded-full font-bold border ${whoOf(c.who).cls}`}>
              👤 {whoOf(c.who).label}
            </span>
          <span className="text-sm text-brown-light">{freqLabel(c.every)} · {room.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
          {doneToday && (
            <button onClick={() => onUndo(entry)} title="Ongedaan maken" className="text-brown-light hover:text-brown"><Undo2 size={16} /></button>
          )}
          <button onClick={() => onEdit(entry)} title="Aanpassen" className="text-brown-light hover:text-brown"><Pencil size={16} /></button>
          <button onClick={() => onDelete(entry.id)} title="Verwijderen" className="text-rose/70 hover:text-rose"><Trash2 size={16} /></button>
        </div>
      </div>

      {/* Laatst gedaan  →  volgende keer */}
      <div className="mt-3 bg-warm/50 rounded-xl px-3 py-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide font-bold text-brown-light">Laatst gedaan</p>
            {last ? (
              <>
                <p className="text-lg font-semibold text-brown leading-tight">{agoLabel(last.at)}</p>
                <p className="text-sm text-brown-light">{format(new Date(last.at), "EEE d MMM", { locale: nl })}</p>
              </>
            ) : (
              <p className="text-lg text-brown-light leading-tight">Nog nooit</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide font-bold text-brown-light flex items-center justify-end gap-1">
              <CalendarClock size={13} /> Volgende keer
            </p>
            {status.next ? (
              <>
                <p className={`text-lg font-bold capitalize leading-tight ${NEXT_TEXT[status.tone]}`}>
                  {format(status.next, "EEEE d MMMM", { locale: nl })}
                </p>
                <p className={`text-sm font-semibold ${NEXT_TEXT[status.tone]}`}>{status.label}</p>
              </>
            ) : (
              <p className="text-lg font-bold text-terracotta leading-tight">Zo snel mogelijk</p>
            )}
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-cream overflow-hidden">
          <div className={`h-full rounded-full ${BAR[status.tone]}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Geschiedenis */}
      {history.length > 0 && (
        <div className="mt-3">
          <p className="text-xs uppercase tracking-wide font-bold text-brown-light mb-1.5">
            Geschiedenis · {history.length}× gedaan
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(open ? history : history.slice(0, 5)).map((h, i) => (
              <span key={i}
                className={`text-sm px-2.5 py-1 rounded-full border ${i === 0 ? "bg-sage-light/40 border-sage-light text-sage font-semibold" : "bg-cream border-warm text-brown"}`}>
                ✓ {format(new Date(h.at), "d MMM yyyy", { locale: nl })}
              </span>
            ))}
            {history.length > 5 && (
              <button onClick={() => setOpen(!open)} className="text-sm px-2.5 py-1 rounded-full text-terracotta font-semibold hover:bg-warm">
                {open ? "Minder" : `+${history.length - 5} meer`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

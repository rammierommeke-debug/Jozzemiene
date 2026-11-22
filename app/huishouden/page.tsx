"use client";

import { useState, useEffect, useMemo } from "react";
import { Sparkles, Plus, Trash2, Check, Pencil, X, Undo2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { differenceInCalendarDays, format, startOfWeek } from "date-fns";
import { nl } from "date-fns/locale";

// Opgeslagen in custom_entries (slug "huishouden"), veld `data`.
type Done = { at: string; by: string };
type Chore = {
  title: string;
  room: string;
  every: number; // aantal dagen tussen keren
  who: string;   // roel | emma | samen | afwisselend
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
const freqLabel = (d: number) => FREQS.find((f) => f.days === d)?.label ?? `Elke ${d} dagen`;

const WHO: { key: string; label: string }[] = [
  { key: "samen", label: "Samen" },
  { key: "roel", label: "Roel" },
  { key: "emma", label: "Emma" },
  { key: "afwisselend", label: "Afwisselend" },
];
const personLabel = (k: string) => (k === "roel" ? "Roel" : k === "emma" ? "Emma" : k);

const STARTERS: Omit<Chore, "history">[] = [
  { title: "Afwas / vaatwasser", room: "keuken", every: 1, who: "afwisselend" },
  { title: "Aanrecht & fornuis afnemen", room: "keuken", every: 3, who: "samen" },
  { title: "Koelkast opruimen", room: "keuken", every: 14, who: "samen" },
  { title: "Toilet poetsen", room: "badkamer", every: 7, who: "afwisselend" },
  { title: "Douche & lavabo", room: "badkamer", every: 7, who: "afwisselend" },
  { title: "Stofzuigen", room: "woonkamer", every: 7, who: "afwisselend" },
  { title: "Dweilen", room: "woonkamer", every: 14, who: "samen" },
  { title: "Afstoffen", room: "woonkamer", every: 14, who: "samen" },
  { title: "Bed verschonen", room: "slaapkamer", every: 14, who: "samen" },
  { title: "Was draaien", room: "was", every: 3, who: "afwisselend" },
  { title: "Vuilnis buiten zetten", room: "buiten", every: 7, who: "afwisselend" },
  { title: "Planten water geven", room: "overig", every: 7, who: "samen" },
  { title: "Steelstofzuiger uitkuisen", room: "overig", every: 30, who: "samen" },
  { title: "Robotstofzuiger uitkuisen", room: "overig", every: 30, who: "samen" },
  { title: "Zout aanvullen", room: "keuken", every: 90, who: "samen" },
];

const emptyForm = { title: "", room: "keuken", every: 7, who: "samen" };

type Status = { daysLeft: number | null; label: string; tone: "late" | "today" | "soon" | "ok" | "new" };

function statusOf(c: Chore, today: Date): Status {
  const last = c.history[0];
  if (!last) return { daysLeft: null, label: "Nog nooit gedaan", tone: "new" };
  const left = c.every - differenceInCalendarDays(today, new Date(last.at));
  if (left < 0) return { daysLeft: left, label: `${-left} ${-left === 1 ? "dag" : "dagen"} te laat`, tone: "late" };
  if (left === 0) return { daysLeft: 0, label: "Vandaag", tone: "today" };
  if (left === 1) return { daysLeft: 1, label: "Morgen", tone: "soon" };
  return { daysLeft: left, label: `Over ${left} dagen`, tone: left <= 2 ? "soon" : "ok" };
}

// Bij "afwisselend": wie is er aan de beurt (de ander dan wie het laatst deed).
function turnOf(c: Chore): string | null {
  if (c.who !== "afwisselend") return null;
  const last = c.history[0]?.by;
  if (last === "roel") return "emma";
  if (last === "emma") return "roel";
  return null;
}

const TONE: Record<Status["tone"], string> = {
  late: "bg-rose/15 text-rose",
  today: "bg-terracotta/15 text-terracotta",
  soon: "bg-warm text-brown",
  ok: "bg-sage-light/40 text-sage",
  new: "bg-warm text-brown-light",
};

export default function HuishoudenPage() {
  const { data: session } = useSession();
  const me = session?.user?.name === "roel" ? "roel" : "emma";

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [view, setView] = useState<"todo" | "ruimte">("todo");
  const [busy, setBusy] = useState(false);

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
    setForm({ title: e.data.title, room: e.data.room, every: e.data.every, who: e.data.who });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function markDone(e: Entry) {
    const history = [{ at: new Date().toISOString(), by: me }, ...(e.data.history ?? [])].slice(0, 30);
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
        .map((e) => ({ e, s: statusOf({ ...e.data, history: e.data.history ?? [] }, today) }))
        .sort((a, b) => (a.s.daysLeft ?? -999) - (b.s.daysLeft ?? -999)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries]
  );

  const todo = items.filter((i) => i.s.tone === "late" || i.s.tone === "today" || i.s.tone === "new");
  const later = items.filter((i) => !todo.includes(i));

  // Weekscore (maandag t/m zondag)
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const score = { roel: 0, emma: 0 };
  for (const { e } of items)
    for (const h of e.data.history ?? [])
      if (new Date(h.at) >= weekStart && (h.by === "roel" || h.by === "emma")) score[h.by]++;
  const totalWeek = score.roel + score.emma;

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
            <p className="text-xs text-brown-light">Te doen</p>
          </div>
          <div className="bg-warm rounded-2xl p-4 text-center border border-warm">
            <p className="font-display text-2xl text-brown">{score.roel}</p>
            <p className="text-xs text-brown-light">Roel deze week</p>
          </div>
          <div className="bg-warm rounded-2xl p-4 text-center border border-warm">
            <p className="font-display text-2xl text-brown">{score.emma}</p>
            <p className="text-xs text-brown-light">Emma deze week</p>
          </div>
        </div>
      )}
      {totalWeek > 0 && (
        <div className="mb-6 -mt-3">
          <div className="h-2 rounded-full bg-warm overflow-hidden flex">
            <div className="bg-terracotta transition-all" style={{ width: `${(score.roel / totalWeek) * 100}%` }} />
            <div className="bg-sage transition-all" style={{ width: `${(score.emma / totalWeek) * 100}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-brown-light mt-1">
            <span>Roel</span>
            <span>Emma</span>
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
            <Picker label="Hoe vaak" value={String(form.every)} onChange={(v) => setForm({ ...form, every: Number(v) })}
              options={FREQS.map((f) => ({ key: String(f.days), label: f.label }))} />
            <Picker label="Wie" value={form.who} onChange={(who) => setForm({ ...form, who })}
              options={WHO} />
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
          <div className="flex gap-1.5 mb-5">
            {([["todo", "Planning"], ["ruimte", "Per ruimte"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setView(k)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  view === k ? "bg-brown text-cream" : "bg-warm text-brown-light hover:text-brown"
                }`}>
                {l}
              </button>
            ))}
          </div>

          {view === "todo" ? (
            <div className="flex flex-col gap-6">
              <Section title="Nu te doen" count={todo.length}>
                {todo.length === 0 ? (
                  <p className="font-handwriting text-xl text-sage text-center py-4">Alles is bij! ✨</p>
                ) : (
                  todo.map(({ e, s }) => (
                    <ChoreRow key={e.id} entry={e} status={s} me={me}
                      onDone={markDone} onUndo={undoDone} onEdit={startEdit} onDelete={remove} />
                  ))
                )}
              </Section>
              {later.length > 0 && (
                <Section title="Binnenkort" count={later.length}>
                  {later.map(({ e, s }) => (
                    <ChoreRow key={e.id} entry={e} status={s} me={me}
                      onDone={markDone} onUndo={undoDone} onEdit={startEdit} onDelete={remove} />
                  ))}
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
                    {list.map(({ e, s }) => (
                      <ChoreRow key={e.id} entry={e} status={s} me={me}
                        onDone={markDone} onUndo={undoDone} onEdit={startEdit} onDelete={remove} />
                    ))}
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
        <p className="text-xs font-bold text-brown-light uppercase tracking-wide">{title}</p>
        <span className="text-xs text-brown-light">({count})</span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function ChoreRow({ entry, status, me, onDone, onUndo, onEdit, onDelete }: {
  entry: Entry; status: Status; me: string;
  onDone: (e: Entry) => void; onUndo: (e: Entry) => void; onEdit: (e: Entry) => void; onDelete: (id: string) => void;
}) {
  const c = entry.data;
  const room = roomOf(c.room);
  const last = c.history?.[0];
  const turn = turnOf(c);
  const doneToday = last && differenceInCalendarDays(new Date(), new Date(last.at)) === 0;
  const whoText = turn ? `${personLabel(turn)} is aan de beurt` : c.who === "afwisselend" ? "Afwisselend" : c.who === "samen" ? "Samen" : personLabel(c.who);
  const mine = turn === me || c.who === me;

  return (
    <div className={`bg-cream rounded-2xl px-4 py-3 border flex items-center gap-3 group ${mine && status.tone !== "ok" ? "border-terracotta/40" : "border-warm"}`}>
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
          <span className="text-base leading-none">{room.emoji}</span>
          <p className="text-sm font-semibold text-brown">{c.title}</p>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${TONE[status.tone]}`}>{status.label}</span>
        </div>
        <p className="text-xs text-brown-light mt-0.5">
          {freqLabel(c.every)} · {whoText}
          {last && <> · laatst {format(new Date(last.at), "d MMM", { locale: nl })} door {personLabel(last.by)}</>}
        </p>
      </div>

      <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
        {doneToday && (
          <button onClick={() => onUndo(entry)} title="Ongedaan maken" className="text-brown-light hover:text-brown"><Undo2 size={13} /></button>
        )}
        <button onClick={() => onEdit(entry)} title="Aanpassen" className="text-brown-light hover:text-brown"><Pencil size={13} /></button>
        <button onClick={() => onDelete(entry.id)} title="Verwijderen" className="text-rose/70 hover:text-rose"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

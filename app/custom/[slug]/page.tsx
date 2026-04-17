"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2, Check, X, Pencil, RotateCcw, MapPin, Clock } from "lucide-react";
import { useTheme } from "@/lib/themeContext";
import { getIcon } from "@/lib/iconMap";
import { format, parseISO, isPast } from "date-fns";
import { nl } from "date-fns/locale";

type Entry = { id: string; data: Record<string, unknown>; created_at: string };

function useEntries(slug: string) {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    fetch(`/api/custom/${slug}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setEntries(d); })
      .catch(() => {});
  }, [slug]);

  const addEntry = useCallback(async (data: Record<string, unknown>) => {
    const res = await fetch(`/api/custom/${slug}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    if (res.ok) {
      const entry = await res.json();
      setEntries(prev => [...prev, entry]);
      return entry as Entry;
    }
  }, [slug]);

  const updateEntry = useCallback(async (id: string, data: Record<string, unknown>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, data: { ...e.data, ...data } } : e));
    await fetch(`/api/custom/${slug}/entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
  }, [slug]);

  const deleteEntry = useCallback(async (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    await fetch(`/api/custom/${slug}/entries/${id}`, { method: "DELETE" });
  }, [slug]);

  return { entries, setEntries, addEntry, updateEntry, deleteEntry };
}

// ─── PAGE HEADER ────────────────────────────────────────────────────────────
function PageHeader({ label, iconName, subtitle }: { label: string; iconName: string; subtitle: string }) {
  const IconComp = getIcon(iconName);
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="w-12 h-12 rounded-2xl bg-warm flex items-center justify-center">
        <IconComp size={24} className="text-terracotta" />
      </div>
      <div>
        <h1 className="font-display text-3xl text-brown">{label}</h1>
        <p className="text-brown-light text-sm">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── TEKST ──────────────────────────────────────────────────────────────────
function TekstPage({ slug, label, iconName }: { slug: string; label: string; iconName: string }) {
  const { entries, addEntry, updateEntry } = useEntries(slug);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const entry = entries[0];
  const content = (entry?.data?.content as string) ?? "";

  function startEdit() { setDraft(content); setEditing(true); }

  async function save() {
    if (entry) {
      await updateEntry(entry.id, { content: draft });
    } else {
      await addEntry({ content: draft });
    }
    setEditing(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader label={label} iconName={iconName} subtitle="Vrije tekst" />
      <div className="bg-warm rounded-3xl p-6">
        {editing ? (
          <div className="flex flex-col gap-3">
            <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)}
              placeholder="Schrijf hier iets..." rows={12}
              className="w-full bg-cream rounded-2xl p-4 text-brown text-sm leading-relaxed resize-none border border-warm focus:outline-none focus:border-terracotta" />
            <div className="flex gap-2">
              <button onClick={save} className="flex items-center gap-2 bg-terracotta text-cream px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-terracotta/80 transition-colors">
                <Check size={14} /> Opslaan
              </button>
              <button onClick={() => setEditing(false)} className="flex items-center gap-2 text-brown-light hover:text-rose px-4 py-2.5 rounded-xl text-sm transition-colors">
                <X size={14} /> Annuleren
              </button>
            </div>
          </div>
        ) : (
          <div>
            {content ? (
              <div className="text-brown text-sm leading-relaxed whitespace-pre-wrap mb-4">{content}</div>
            ) : (
              <p className="text-brown-light text-sm italic mb-4">Nog leeg. Klik op bewerken!</p>
            )}
            <button onClick={startEdit} className="flex items-center gap-2 text-brown-light hover:text-terracotta transition-colors text-sm">
              <Pencil size={14} /> Bewerken
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BLOG ───────────────────────────────────────────────────────────────────
function BlogPage({ slug, label, iconName }: { slug: string; label: string; iconName: string }) {
  const { entries, addEntry, deleteEntry } = useEntries(slug);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function submit() {
    if (!title.trim() || !body.trim()) return;
    await addEntry({ title: title.trim(), body: body.trim() });
    setTitle(""); setBody(""); setShowForm(false);
  }

  const sorted = [...entries].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader label={label} iconName={iconName} subtitle="Blog posts" />

      <button onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 bg-terracotta text-cream px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-terracotta/80 transition-colors mb-6">
        <Plus size={16} /> Nieuwe post
      </button>

      {showForm && (
        <div className="bg-warm rounded-3xl p-5 mb-6 flex flex-col gap-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel van je post"
            className="bg-cream rounded-2xl px-4 py-2.5 text-brown font-semibold text-sm border border-warm focus:outline-none focus:border-terracotta" />
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Schrijf je post hier..." rows={6} autoFocus
            className="bg-cream rounded-2xl p-4 text-brown text-sm leading-relaxed resize-none border border-warm focus:outline-none focus:border-terracotta" />
          <div className="flex gap-2">
            <button onClick={submit} disabled={!title.trim() || !body.trim()}
              className="flex-1 bg-terracotta text-cream rounded-xl py-2.5 text-sm font-semibold hover:bg-terracotta/80 disabled:opacity-40 transition-colors">
              Publiceren
            </button>
            <button onClick={() => { setShowForm(false); setTitle(""); setBody(""); }}
              className="px-4 text-brown-light hover:text-rose transition-colors"><X size={16} /></button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {sorted.length === 0 && <p className="text-brown-light font-handwriting text-lg">Nog geen posts. Schrijf je eerste!</p>}
        {sorted.map(e => (
          <div key={e.id} className="bg-cream rounded-3xl p-6 border border-warm group">
            <div className="flex justify-between items-start mb-2">
              <h2 className="font-display text-xl text-brown">{e.data.title as string}</h2>
              <button onClick={() => deleteEntry(e.id)} className="opacity-0 group-hover:opacity-100 text-brown-light hover:text-rose transition-all">
                <Trash2 size={14} />
              </button>
            </div>
            <p className="text-xs text-brown-light mb-3">{format(parseISO(e.created_at), "d MMMM yyyy", { locale: nl })}</p>
            <p className="text-brown text-sm leading-relaxed whitespace-pre-wrap">{e.data.body as string}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DAGBOEK ────────────────────────────────────────────────────────────────
const MOODS = ["😄", "😊", "😐", "😔", "😢", "😡", "😍", "🥰", "😴", "🤒"];

function DagboekPage({ slug, label, iconName }: { slug: string; label: string; iconName: string }) {
  const { entries, addEntry, deleteEntry } = useEntries(slug);
  const [showForm, setShowForm] = useState(false);
  const [mood, setMood] = useState("😊");
  const [body, setBody] = useState("");

  async function submit() {
    if (!body.trim()) return;
    await addEntry({ mood, body: body.trim() });
    setMood("😊"); setBody(""); setShowForm(false);
  }

  const sorted = [...entries].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader label={label} iconName={iconName} subtitle="Dagboek entries" />

      <button onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 bg-terracotta text-cream px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-terracotta/80 transition-colors mb-6">
        <Plus size={16} /> Nieuwe entry
      </button>

      {showForm && (
        <div className="bg-warm rounded-3xl p-5 mb-6 flex flex-col gap-3">
          <div>
            <p className="text-xs text-brown-light mb-2">Hoe voel je je?</p>
            <div className="flex gap-2 flex-wrap">
              {MOODS.map(m => (
                <button key={m} onClick={() => setMood(m)}
                  className={`text-2xl p-1.5 rounded-xl transition-all ${mood === m ? "bg-terracotta scale-125" : "hover:bg-warm"}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Wat heb je vandaag beleefd?" rows={5} autoFocus
            className="bg-cream rounded-2xl p-4 text-brown text-sm leading-relaxed resize-none border border-warm focus:outline-none focus:border-terracotta" />
          <div className="flex gap-2">
            <button onClick={submit} disabled={!body.trim()}
              className="flex-1 bg-terracotta text-cream rounded-xl py-2.5 text-sm font-semibold hover:bg-terracotta/80 disabled:opacity-40 transition-colors">
              Opslaan
            </button>
            <button onClick={() => { setShowForm(false); setBody(""); }}
              className="px-4 text-brown-light hover:text-rose transition-colors"><X size={16} /></button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {sorted.length === 0 && <p className="text-brown-light font-handwriting text-lg">Nog geen entries. Begin met schrijven!</p>}
        {sorted.map(e => (
          <div key={e.id} className="bg-cream rounded-3xl p-5 border border-warm group flex gap-4">
            <div className="text-3xl">{e.data.mood as string}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-brown-light mb-2">{format(parseISO(e.created_at), "EEEE d MMMM yyyy", { locale: nl })}</p>
              <p className="text-brown text-sm leading-relaxed whitespace-pre-wrap">{e.data.body as string}</p>
            </div>
            <button onClick={() => deleteEntry(e.id)} className="opacity-0 group-hover:opacity-100 text-brown-light hover:text-rose transition-all shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AGENDA ─────────────────────────────────────────────────────────────────
function AgendaPage({ slug, label, iconName }: { slug: string; label: string; iconName: string }) {
  const { entries, addEntry, deleteEntry } = useEntries(slug);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

  async function submit() {
    if (!title.trim() || !date) return;
    await addEntry({ title: title.trim(), date, time, location: location.trim() });
    setTitle(""); setDate(""); setTime(""); setLocation(""); setShowForm(false);
  }

  const sorted = [...entries].sort((a, b) => {
    const da = `${a.data.date}${a.data.time || ""}`;
    const db = `${b.data.date}${b.data.time || ""}`;
    return da.localeCompare(db);
  });
  const upcoming = sorted.filter(e => !isPast(parseISO(`${e.data.date}T${e.data.time || "23:59"}`)));
  const past = sorted.filter(e => isPast(parseISO(`${e.data.date}T${e.data.time || "23:59"}`)));

  function EventCard({ e }: { e: Entry }) {
    const faded = isPast(parseISO(`${e.data.date}T${e.data.time || "23:59"}`));
    return (
      <div className={`bg-cream rounded-3xl p-4 border group flex gap-4 ${faded ? "border-warm opacity-60" : "border-warm"}`}>
        <div className="bg-warm rounded-2xl px-3 py-2 text-center min-w-[52px]">
          <p className="font-display text-xl text-terracotta leading-none">{format(parseISO(e.data.date as string), "d")}</p>
          <p className="text-xs text-brown-light capitalize">{format(parseISO(e.data.date as string), "MMM", { locale: nl })}</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-brown text-sm">{e.data.title as string}</p>
          <div className="flex gap-3 mt-1">
            {!!(e.data.time as string) && <span className="flex items-center gap-1 text-xs text-brown-light"><Clock size={10} />{e.data.time as string}</span>}
            {!!(e.data.location as string) && <span className="flex items-center gap-1 text-xs text-brown-light"><MapPin size={10} />{e.data.location as string}</span>}
          </div>
        </div>
        <button onClick={() => deleteEntry(e.id)} className="opacity-0 group-hover:opacity-100 text-brown-light hover:text-rose transition-all shrink-0">
          <Trash2 size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader label={label} iconName={iconName} subtitle="Jouw afspraken" />

      <button onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 bg-terracotta text-cream px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-terracotta/80 transition-colors mb-6">
        <Plus size={16} /> Afspraak toevoegen
      </button>

      {showForm && (
        <div className="bg-warm rounded-3xl p-5 mb-6 flex flex-col gap-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Wat? (bv. Tandarts)" autoFocus
            className="bg-cream rounded-2xl px-4 py-2.5 text-brown text-sm border border-warm focus:outline-none focus:border-terracotta" />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-brown-light mb-1 block">Datum</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-cream rounded-2xl px-4 py-2.5 text-brown text-sm border border-warm focus:outline-none focus:border-terracotta" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-brown-light mb-1 block">Tijd (optioneel)</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full bg-cream rounded-2xl px-4 py-2.5 text-brown text-sm border border-warm focus:outline-none focus:border-terracotta" />
            </div>
          </div>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Waar? (optioneel)"
            className="bg-cream rounded-2xl px-4 py-2.5 text-brown text-sm border border-warm focus:outline-none focus:border-terracotta" />
          <div className="flex gap-2">
            <button onClick={submit} disabled={!title.trim() || !date}
              className="flex-1 bg-terracotta text-cream rounded-xl py-2.5 text-sm font-semibold hover:bg-terracotta/80 disabled:opacity-40 transition-colors">
              Toevoegen
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 text-brown-light hover:text-rose transition-colors"><X size={16} /></button>
          </div>
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <p className="text-brown-light font-handwriting text-lg">Geen afspraken. Voeg de eerste toe!</p>
      )}

      {upcoming.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-brown-light uppercase tracking-wide mb-3">Aankomend</p>
          <div className="flex flex-col gap-2">{upcoming.map(e => <EventCard key={e.id} e={e} />)}</div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-brown-light uppercase tracking-wide mb-3">Geweest</p>
          <div className="flex flex-col gap-2">{past.map(e => <EventCard key={e.id} e={e} />)}</div>
        </div>
      )}
    </div>
  );
}

// ─── TRAINING ───────────────────────────────────────────────────────────────
const SPORT_TYPES = [
  { value: "lopen",   emoji: "🏃", label: "Lopen" },
  { value: "fietsen", emoji: "🚴", label: "Fietsen" },
  { value: "zwemmen", emoji: "🏊", label: "Zwemmen" },
  { value: "gym",     emoji: "💪", label: "Gym" },
  { value: "yoga",    emoji: "🧘", label: "Yoga" },
  { value: "wandelen",emoji: "🚶", label: "Wandelen" },
  { value: "sport",   emoji: "⚽", label: "Andere sport" },
];

function TrainingPage({ slug, label, iconName }: { slug: string; label: string; iconName: string }) {
  const { entries, addEntry, deleteEntry } = useEntries(slug);
  const [showForm, setShowForm] = useState(false);
  const [sportType, setSportType] = useState("lopen");
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  async function submit() {
    await addEntry({
      type: sportType,
      distance: distance ? parseFloat(distance) : null,
      duration: duration.trim() || null,
      notes: notes.trim() || null,
    });
    setDistance(""); setDuration(""); setNotes(""); setShowForm(false);
  }

  const sorted = [...entries].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const totalKm = entries.reduce((s, e) => s + (e.data.distance as number ?? 0), 0);
  const totalSessions = entries.length;

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader label={label} iconName={iconName} subtitle="Trainingslog" />

      {/* Stats */}
      {totalSessions > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-warm rounded-2xl p-4 text-center">
            <p className="font-display text-2xl text-terracotta">{totalSessions}</p>
            <p className="text-xs text-brown-light">trainingen</p>
          </div>
          <div className="bg-warm rounded-2xl p-4 text-center">
            <p className="font-display text-2xl text-sage">{totalKm.toFixed(1)} km</p>
            <p className="text-xs text-brown-light">totaal</p>
          </div>
        </div>
      )}

      <button onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 bg-terracotta text-cream px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-terracotta/80 transition-colors mb-6">
        <Plus size={16} /> Training toevoegen
      </button>

      {showForm && (
        <div className="bg-warm rounded-3xl p-5 mb-6 flex flex-col gap-3">
          <div>
            <p className="text-xs text-brown-light mb-2">Type training:</p>
            <div className="grid grid-cols-3 gap-1.5">
              {SPORT_TYPES.map(st => (
                <button key={st.value} onClick={() => setSportType(st.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${sportType === st.value ? "bg-terracotta text-cream" : "bg-cream text-brown hover:bg-terracotta/10"}`}>
                  {st.emoji} {st.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-brown-light mb-1 block">Afstand (km, optioneel)</label>
              <input type="number" min="0" step="0.1" value={distance} onChange={e => setDistance(e.target.value)} placeholder="bv. 5.2"
                className="w-full bg-cream rounded-2xl px-4 py-2.5 text-brown text-sm border border-warm focus:outline-none focus:border-terracotta" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-brown-light mb-1 block">Tijd (optioneel)</label>
              <input value={duration} onChange={e => setDuration(e.target.value)} placeholder="bv. 32:15"
                className="w-full bg-cream rounded-2xl px-4 py-2.5 text-brown text-sm border border-warm focus:outline-none focus:border-terracotta" />
            </div>
          </div>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notities (optioneel)"
            className="bg-cream rounded-2xl px-4 py-2.5 text-brown text-sm border border-warm focus:outline-none focus:border-terracotta" />
          <div className="flex gap-2">
            <button onClick={submit}
              className="flex-1 bg-terracotta text-cream rounded-xl py-2.5 text-sm font-semibold hover:bg-terracotta/80 transition-colors">
              Opslaan
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 text-brown-light hover:text-rose transition-colors"><X size={16} /></button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sorted.length === 0 && <p className="text-brown-light font-handwriting text-lg">Nog geen trainingen. Ga ervoor!</p>}
        {sorted.map(e => {
          const st = SPORT_TYPES.find(s => s.value === e.data.type) ?? SPORT_TYPES[0];
          return (
            <div key={e.id} className="bg-cream rounded-3xl p-4 border border-warm group flex items-center gap-4">
              <span className="text-2xl">{st.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brown text-sm">{st.label}</p>
                <div className="flex gap-3 mt-0.5">
                  {!!(e.data.distance as number) && <span className="text-xs text-brown-light">{e.data.distance as number} km</span>}
                  {!!(e.data.duration as string) && <span className="text-xs text-brown-light">⏱ {e.data.duration as string}</span>}
                  {!!(e.data.notes as string) && <span className="text-xs text-brown-light italic truncate">{e.data.notes as string}</span>}
                </div>
              </div>
              <p className="text-xs text-brown-light shrink-0">{format(parseISO(e.created_at), "d MMM", { locale: nl })}</p>
              <button onClick={() => deleteEntry(e.id)} className="opacity-0 group-hover:opacity-100 text-brown-light hover:text-rose transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CHECKLIST ──────────────────────────────────────────────────────────────
function ChecklistPage({ slug, label, iconName }: { slug: string; label: string; iconName: string }) {
  const { entries, addEntry, updateEntry, deleteEntry } = useEntries(slug);
  const [newItem, setNewItem] = useState("");

  async function add() {
    if (!newItem.trim()) return;
    await addEntry({ text: newItem.trim(), checked: false });
    setNewItem("");
  }

  async function toggle(e: Entry) {
    await updateEntry(e.id, { text: e.data.text, checked: !e.data.checked });
  }

  async function resetAll() {
    for (const e of entries) {
      if (e.data.checked) await updateEntry(e.id, { text: e.data.text, checked: false });
    }
  }

  const done = entries.filter(e => e.data.checked).length;

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader label={label} iconName={iconName} subtitle="Checklist" />

      {/* Progress */}
      {entries.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-brown-light">Voortgang</span>
            <span className="font-semibold text-brown">{done}/{entries.length}</span>
          </div>
          <div className="w-full bg-warm rounded-full h-2.5 overflow-hidden">
            <div className="bg-sage h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${entries.length > 0 ? (done / entries.length) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {/* Add item */}
      <div className="flex gap-2 mb-6">
        <input value={newItem} onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Nieuw item toevoegen..."
          className="flex-1 bg-warm rounded-2xl px-4 py-2.5 text-brown text-sm border border-warm focus:outline-none focus:border-terracotta" />
        <button onClick={add} disabled={!newItem.trim()}
          className="bg-terracotta text-cream px-4 rounded-2xl text-sm font-semibold hover:bg-terracotta/80 disabled:opacity-40 transition-colors">
          <Plus size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {entries.length === 0 && <p className="text-brown-light font-handwriting text-lg">Nog leeg. Voeg je eerste item toe!</p>}
        {entries.map(e => (
          <div key={e.id} className="flex items-center gap-3 bg-cream rounded-2xl p-3 border border-warm group">
            <button onClick={() => toggle(e)}
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${e.data.checked ? "bg-sage border-sage" : "border-warm hover:border-sage"}`}>
              {!!(e.data.checked as boolean) && <Check size={12} className="text-cream" />}
            </button>
            <span className={`flex-1 text-sm ${e.data.checked ? "line-through text-brown-light" : "text-brown"}`}>
              {e.data.text as string}
            </span>
            <button onClick={() => deleteEntry(e.id)} className="opacity-0 group-hover:opacity-100 text-brown-light hover:text-rose transition-all">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {done > 0 && (
        <button onClick={resetAll}
          className="flex items-center gap-2 mt-4 text-sm text-brown-light hover:text-terracotta transition-colors">
          <RotateCcw size={14} /> Alles opnieuw afvinken
        </button>
      )}
    </div>
  );
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
export default function CustomPage() {
  const { slug } = useParams<{ slug: string }>();
  const { config } = useTheme();
  const href = `/custom/${slug}`;
  const navItem = config.navItems.find(i => i.href === href);
  const label = navItem?.label || slug;
  const iconName = navItem?.iconName || "Star";
  const pageType = navItem?.pageType ?? "tekst";

  const props = { slug, label, iconName };

  switch (pageType) {
    case "blog":      return <BlogPage {...props} />;
    case "dagboek":   return <DagboekPage {...props} />;
    case "agenda":    return <AgendaPage {...props} />;
    case "training":  return <TrainingPage {...props} />;
    case "checklist": return <ChecklistPage {...props} />;
    default:          return <TekstPage {...props} />;
  }
}

"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, Trash2, Upload, MapPin, Wallet, BookOpen, CalendarDays, Check, Clock, ChevronDown, ChevronUp, Map } from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { use } from "react";
import dynamic from "next/dynamic";

const TripMap = dynamic(() => import("@/components/TripMap"), { ssr: false, loading: () => <div className="h-96 bg-warm rounded-3xl animate-pulse" /> });

// --- Types ---
type Activity = { id: string; time: string; title: string; emoji: string; done: boolean };
type DayBlock = { type: "day"; date: string; activities: Activity[] };
type PlaceBlock = { type: "place"; id: string; name: string; emoji: string; category: string; notes: string; done: boolean; lat?: number; lng?: number };
type ExpenseBlock = { type: "expense"; id: string; title: string; amount: number; category: string; emoji: string };
type TextBlock = { type: "text"; id: string; content: string };
type PhotoBlock = { type: "photo"; id: string; content: string; caption: string };
type Block = DayBlock | PlaceBlock | ExpenseBlock | TextBlock | PhotoBlock;

type Trip = {
  id: string; title: string; destination: string; flag: string;
  dateFrom: string; dateTo: string; description: string;
  coverColor: string; blocks: Block[]; created_at: string;
};

const PLACE_CATEGORIES = ["🏛️ Bezienswaarding", "🍽️ Restaurant", "🏨 Hotel", "🌿 Natuur", "🛍️ Winkelen", "🎭 Activiteit"];
const EXPENSE_CATEGORIES = [
  { label: "✈️ Vlucht", emoji: "✈️" },
  { label: "🏨 Hotel", emoji: "🏨" },
  { label: "🍽️ Eten", emoji: "🍽️" },
  { label: "🚌 Vervoer", emoji: "🚌" },
  { label: "🎭 Activiteit", emoji: "🎭" },
  { label: "🛍️ Shopping", emoji: "🛍️" },
  { label: "💡 Overig", emoji: "💡" },
];

function uid() { return Math.random().toString(36).slice(2); }

export default function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"planning" | "plekken" | "budget" | "dagboek">("planning");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Dagplanning state
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [addingActivity, setAddingActivity] = useState<string | null>(null);
  const [actForm, setActForm] = useState({ time: "", title: "", emoji: "📍" });

  // Plekken state
  const [showPlaceForm, setShowPlaceForm] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [placeForm, setPlaceForm] = useState({ name: "", emoji: "📍", category: PLACE_CATEGORIES[0], notes: "" });

  // Budget state
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expForm, setExpForm] = useState({ title: "", amount: "", category: EXPENSE_CATEGORIES[0].label, emoji: EXPENSE_CATEGORIES[0].emoji });

  // Dagboek state
  const [addingBlock, setAddingBlock] = useState<"text" | "photo" | null>(null);
  const [newText, setNewText] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch(`/api/trips/${id}`).then((r) => r.json()).then(setTrip).finally(() => setLoading(false));
  }, [id]);

  async function patchBlocks(blocks: Block[]) {
    setSaving(true);
    const res = await fetch(`/api/trips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });
    const updated = await res.json();
    setTrip(updated);
    setSaving(false);
    return updated;
  }

  // --- Dagplanning ---
  function getDays(): string[] {
    if (!trip?.dateFrom || !trip?.dateTo) return [];
    try {
      return eachDayOfInterval({ start: parseISO(trip.dateFrom), end: parseISO(trip.dateTo) })
        .map((d) => format(d, "yyyy-MM-dd"));
    } catch { return []; }
  }

  function getDayBlock(date: string): DayBlock {
    return (trip?.blocks.find((b) => b.type === "day" && (b as DayBlock).date === date) as DayBlock) ?? { type: "day", date, activities: [] };
  }

  async function addActivity(date: string) {
    if (!actForm.title.trim() || !trip) return;
    const blocks = [...trip.blocks];
    const idx = blocks.findIndex((b) => b.type === "day" && (b as DayBlock).date === date);
    const activity: Activity = { id: uid(), time: actForm.time, title: actForm.title, emoji: actForm.emoji, done: false };
    if (idx >= 0) {
      (blocks[idx] as DayBlock).activities = [...(blocks[idx] as DayBlock).activities, activity];
    } else {
      blocks.push({ type: "day", date, activities: [activity] });
    }
    await patchBlocks(blocks);
    setActForm({ time: "", title: "", emoji: "📍" });
    setAddingActivity(null);
  }

  async function toggleActivity(date: string, actId: string) {
    if (!trip) return;
    const blocks = trip.blocks.map((b) => {
      if (b.type !== "day" || (b as DayBlock).date !== date) return b;
      return { ...b, activities: (b as DayBlock).activities.map((a) => a.id === actId ? { ...a, done: !a.done } : a) };
    });
    await patchBlocks(blocks as Block[]);
  }

  async function deleteActivity(date: string, actId: string) {
    if (!trip) return;
    const blocks = trip.blocks.map((b) => {
      if (b.type !== "day" || (b as DayBlock).date !== date) return b;
      return { ...b, activities: (b as DayBlock).activities.filter((a) => a.id !== actId) };
    }).filter((b) => b.type !== "day" || (b as DayBlock).activities.length > 0) as Block[];
    await patchBlocks(blocks);
  }

  // --- Plekken ---
  function getPlaces(): PlaceBlock[] {
    return trip?.blocks.filter((b) => b.type === "place") as PlaceBlock[] ?? [];
  }

  async function addPlace(overrides?: { name: string; lat: number; lng: number }) {
    if (!trip) return;
    const name = overrides?.name ?? placeForm.name;
    if (!name.trim()) return;
    const place: PlaceBlock = {
      type: "place", id: uid(), name,
      emoji: placeForm.emoji, category: placeForm.category, notes: placeForm.notes, done: false,
      lat: overrides?.lat, lng: overrides?.lng,
    };
    await patchBlocks([...trip.blocks, place]);
    setPlaceForm({ name: "", emoji: "📍", category: PLACE_CATEGORIES[0], notes: "" });
    setShowPlaceForm(false);
  }

  async function togglePlace(placeId: string) {
    if (!trip) return;
    const blocks = trip.blocks.map((b) => b.type === "place" && (b as PlaceBlock).id === placeId ? { ...b, done: !(b as PlaceBlock).done } : b);
    await patchBlocks(blocks as Block[]);
  }

  async function deletePlace(placeId: string) {
    if (!trip) return;
    await patchBlocks(trip.blocks.filter((b) => !(b.type === "place" && (b as PlaceBlock).id === placeId)) as Block[]);
  }

  // --- Budget ---
  function getExpenses(): ExpenseBlock[] {
    return trip?.blocks.filter((b) => b.type === "expense") as ExpenseBlock[] ?? [];
  }

  async function addExpense() {
    if (!expForm.title.trim() || !expForm.amount || !trip) return;
    const expense: ExpenseBlock = { type: "expense", id: uid(), title: expForm.title, amount: parseFloat(expForm.amount), category: expForm.category, emoji: expForm.emoji };
    await patchBlocks([...trip.blocks, expense]);
    setExpForm({ title: "", amount: "", category: EXPENSE_CATEGORIES[0].label, emoji: EXPENSE_CATEGORIES[0].emoji });
    setShowExpenseForm(false);
  }

  async function deleteExpense(expId: string) {
    if (!trip) return;
    await patchBlocks(trip.blocks.filter((b) => !(b.type === "expense" && (b as ExpenseBlock).id === expId)) as Block[]);
  }

  // --- Dagboek ---
  function getDagboekBlocks(): (TextBlock | PhotoBlock)[] {
    return trip?.blocks.filter((b) => b.type === "text" || b.type === "photo") as (TextBlock | PhotoBlock)[] ?? [];
  }

  async function addText() {
    if (!newText.trim() || !trip) return;
    const block: TextBlock = { type: "text", id: uid(), content: newText };
    await patchBlocks([...trip.blocks, block]);
    setNewText(""); setAddingBlock(null);
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
    setNewCaption(""); setAddingBlock(null); setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function deleteBlock(blockId: string) {
    if (!trip) return;
    await patchBlocks(trip.blocks.filter((b) => (b as TextBlock | PhotoBlock).id !== blockId) as Block[]);
  }

  if (loading) return <div className="text-center mt-20 text-brown-light">Laden...</div>;
  if (!trip) return <div className="text-center mt-20 text-brown-light">Reis niet gevonden.</div>;

  const days = getDays();
  const places = getPlaces();
  const expenses = getExpenses();
  const dagboek = getDagboekBlocks();
  const totalBudget = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="max-w-2xl mx-auto pt-14 md:pt-0">
      <Link href="/reizen" className="inline-flex items-center gap-2 text-brown-light hover:text-terracotta transition-colors mb-6 text-sm font-semibold">
        <ArrowLeft size={16} /> Terug naar reizen
      </Link>

      {/* Hero */}
      <div className="rounded-3xl overflow-hidden mb-6" style={{ background: `linear-gradient(135deg, ${trip.coverColor}cc, ${trip.coverColor})` }}>
        <div className="p-8">
          <span className="text-5xl block mb-3">{trip.flag}</span>
          <h1 className="font-display text-4xl text-cream mb-1">{trip.title}</h1>
          <p className="text-cream/80 text-lg mb-2">{trip.destination}</p>
          {(trip.dateFrom || trip.dateTo) && (
            <p className="text-cream/70 text-sm">
              {trip.dateFrom && format(parseISO(trip.dateFrom), "d MMMM yyyy", { locale: nl })}
              {trip.dateFrom && trip.dateTo && " – "}
              {trip.dateTo && format(parseISO(trip.dateTo), "d MMMM yyyy", { locale: nl })}
              {days.length > 0 && ` · ${days.length} dagen`}
            </p>
          )}
          {saving && <p className="text-cream/50 text-xs mt-2">Opslaan...</p>}
        </div>
      </div>

      {trip.description && (
        <p className="font-handwriting text-xl text-brown mb-6 leading-relaxed">{trip.description}</p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-warm rounded-2xl p-1 mb-6 overflow-x-auto">
        {[
          { key: "planning", icon: CalendarDays, label: "Dagplanning" },
          { key: "plekken", icon: MapPin, label: "Plekken" },
          { key: "budget", icon: Wallet, label: "Budget" },
          { key: "dagboek", icon: BookOpen, label: "Dagboek" },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-1 justify-center ${
              tab === key ? "bg-cream text-brown shadow-sm" : "text-brown-light hover:text-brown"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ===== DAGPLANNING ===== */}
      {tab === "planning" && (
        <div className="flex flex-col gap-3">
          {days.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-handwriting text-xl text-brown-light">Geen datums ingesteld 📅</p>
              <p className="text-sm text-brown-light mt-1">Ga terug en stel een begin- en einddatum in.</p>
            </div>
          ) : (
            days.map((date) => {
              const dayBlock = getDayBlock(date);
              const expanded = expandedDays.has(date);
              const label = format(parseISO(date), "EEEE d MMMM", { locale: nl });
              const dayNum = days.indexOf(date) + 1;
              return (
                <div key={date} className="bg-cream rounded-3xl border border-warm overflow-hidden">
                  <button
                    onClick={() => setExpandedDays((prev) => { const n = new Set(prev); n.has(date) ? n.delete(date) : n.add(date); return n; })}
                    className="w-full flex items-center gap-3 p-4 hover:bg-warm/30 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-cream text-sm font-bold shrink-0" style={{ backgroundColor: trip.coverColor }}>
                      {dayNum}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-display text-brown capitalize text-sm">{label}</p>
                      <p className="text-xs text-brown-light">{dayBlock.activities.length} activiteit{dayBlock.activities.length !== 1 ? "en" : ""}</p>
                    </div>
                    {expanded ? <ChevronUp size={16} className="text-brown-light" /> : <ChevronDown size={16} className="text-brown-light" />}
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4 flex flex-col gap-2">
                      {dayBlock.activities.map((act) => (
                        <div key={act.id} className="flex items-center gap-2 bg-warm rounded-2xl px-3 py-2 group">
                          <button onClick={() => toggleActivity(date, act.id)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${act.done ? "border-sage bg-sage" : "border-warm bg-cream"}`}>
                            {act.done && <Check size={11} className="text-cream" />}
                          </button>
                          <span className="text-base shrink-0">{act.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm text-brown leading-tight ${act.done ? "line-through text-brown-light" : ""}`}>{act.title}</p>
                            {act.time && <p className="text-xs text-brown-light flex items-center gap-0.5"><Clock size={10} /> {act.time}</p>}
                          </div>
                          <button onClick={() => deleteActivity(date, act.id)} className="opacity-0 group-hover:opacity-100 text-rose transition-opacity">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}

                      {addingActivity === date ? (
                        <div className="bg-warm rounded-2xl p-3 flex flex-col gap-2">
                          <div className="flex gap-2">
                            <input value={actForm.emoji} onChange={(e) => setActForm({ ...actForm, emoji: e.target.value })} className="w-10 bg-cream rounded-xl border border-warm text-center py-1.5 focus:outline-none" maxLength={2} />
                            <input value={actForm.time} onChange={(e) => setActForm({ ...actForm, time: e.target.value })} type="time" className="bg-cream rounded-xl border border-warm px-2 py-1.5 text-sm text-brown focus:outline-none w-28" />
                          </div>
                          <input
                            value={actForm.title}
                            onChange={(e) => setActForm({ ...actForm, title: e.target.value })}
                            onKeyDown={(e) => { if (e.key === "Enter") addActivity(date); if (e.key === "Escape") setAddingActivity(null); }}
                            placeholder="Activiteit..."
                            autoFocus
                            className="bg-cream rounded-xl border border-warm px-3 py-1.5 text-sm text-brown focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => addActivity(date)} className="flex-1 bg-terracotta text-cream rounded-xl py-1.5 text-xs font-semibold hover:bg-terracotta/80">Toevoegen</button>
                            <button onClick={() => setAddingActivity(null)} className="flex-1 bg-cream text-brown-light rounded-xl py-1.5 text-xs hover:bg-warm">Annuleren</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingActivity(date)}
                          className="flex items-center gap-2 text-brown-light hover:text-terracotta transition-colors text-xs font-semibold py-1"
                        >
                          <Plus size={14} /> Activiteit toevoegen
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ===== PLEKKEN ===== */}
      {tab === "plekken" && (
        <div>
          <div className="flex gap-2 justify-end mb-4">
            <button onClick={() => setShowMap(!showMap)} className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-colors ${showMap ? "bg-sage text-cream" : "bg-warm text-brown hover:bg-cream border border-warm"}`}>
              <Map size={16} /> Kaart
            </button>
            <button onClick={() => setShowPlaceForm(!showPlaceForm)} className="flex items-center gap-2 bg-terracotta text-cream px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-terracotta/80 transition-colors">
              <Plus size={16} /> Handmatig
            </button>
          </div>

          {showMap && (
            <div className="mb-5">
              <TripMap
                places={places}
                onAddPlace={(p) => addPlace({ name: p.name, lat: p.lat, lng: p.lng })}
                coverColor={trip.coverColor}
              />
            </div>
          )}

          {showPlaceForm && (
            <div className="bg-warm rounded-3xl p-5 border border-warm mb-5 flex flex-col gap-3">
              <div className="flex gap-2">
                <input value={placeForm.emoji} onChange={(e) => setPlaceForm({ ...placeForm, emoji: e.target.value })} className="w-12 bg-cream rounded-xl border border-warm text-center py-2 focus:outline-none" maxLength={2} />
                <input value={placeForm.name} onChange={(e) => setPlaceForm({ ...placeForm, name: e.target.value })} placeholder="Naam van de plek..." className="flex-1 bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-terracotta" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PLACE_CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setPlaceForm({ ...placeForm, category: cat })} className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${placeForm.category === cat ? "bg-terracotta text-cream" : "bg-cream text-brown-light hover:bg-warm border border-warm"}`}>{cat}</button>
                ))}
              </div>
              <textarea value={placeForm.notes} onChange={(e) => setPlaceForm({ ...placeForm, notes: e.target.value })} placeholder="Notities (optioneel)..." rows={2} className="bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-terracotta resize-none" />
              <div className="flex gap-2">
                <button onClick={() => addPlace()} className="flex-1 bg-terracotta text-cream rounded-xl py-2 text-sm font-semibold hover:bg-terracotta/80">Toevoegen</button>
                <button onClick={() => setShowPlaceForm(false)} className="flex-1 bg-cream text-brown-light rounded-xl py-2 text-sm hover:bg-warm">Annuleren</button>
              </div>
            </div>
          )}

          {places.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-handwriting text-xl text-brown-light">Nog geen plekken 🗺️</p>
              <p className="text-sm text-brown-light mt-1">Voeg plekken toe die je wil bezoeken.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {places.map((place) => (
                <div key={place.id} className={`bg-cream rounded-2xl border border-warm px-4 py-3 flex items-start gap-3 group transition-all ${place.done ? "opacity-60" : ""}`}>
                  <button onClick={() => togglePlace(place.id)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${place.done ? "border-sage bg-sage" : "border-warm bg-cream"}`}>
                    {place.done && <Check size={13} className="text-cream" />}
                  </button>
                  <span className="text-xl shrink-0">{place.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-display text-brown ${place.done ? "line-through" : ""}`}>{place.name}</p>
                    <p className="text-xs text-brown-light">{place.category}</p>
                    {place.notes && <p className="text-sm text-brown-light mt-1 italic">{place.notes}</p>}
                  </div>
                  <button onClick={() => deletePlace(place.id)} className="opacity-0 group-hover:opacity-100 text-rose transition-opacity shrink-0 mt-0.5">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== BUDGET ===== */}
      {tab === "budget" && (
        <div>
          {/* Totaal */}
          <div className="bg-warm rounded-3xl p-5 border border-warm mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-brown-light font-semibold uppercase tracking-wide">Totaal budget</p>
              <p className="font-display text-4xl text-brown">€{totalBudget.toFixed(2)}</p>
            </div>
            <button onClick={() => setShowExpenseForm(!showExpenseForm)} className="flex items-center gap-2 bg-terracotta text-cream px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-terracotta/80 transition-colors">
              <Plus size={16} /> Uitgave
            </button>
          </div>

          {showExpenseForm && (
            <div className="bg-warm rounded-3xl p-5 border border-warm mb-5 flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5 mb-1">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <button key={cat.label} onClick={() => setExpForm({ ...expForm, category: cat.label, emoji: cat.emoji })} className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${expForm.category === cat.label ? "bg-terracotta text-cream" : "bg-cream text-brown-light hover:bg-warm border border-warm"}`}>{cat.label}</button>
                ))}
              </div>
              <input value={expForm.title} onChange={(e) => setExpForm({ ...expForm, title: e.target.value })} placeholder="Beschrijving (bv. Vlucht naar Tokyo)" className="bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-terracotta" />
              <div className="flex items-center gap-2">
                <span className="text-brown font-semibold">€</span>
                <input value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} type="number" placeholder="0.00" className="flex-1 bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-terracotta" />
              </div>
              <div className="flex gap-2">
                <button onClick={addExpense} className="flex-1 bg-terracotta text-cream rounded-xl py-2 text-sm font-semibold hover:bg-terracotta/80">Toevoegen</button>
                <button onClick={() => setShowExpenseForm(false)} className="flex-1 bg-cream text-brown-light rounded-xl py-2 text-sm hover:bg-warm">Annuleren</button>
              </div>
            </div>
          )}

          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-handwriting text-xl text-brown-light">Nog geen uitgaven 💸</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {expenses.map((exp) => (
                <div key={exp.id} className="bg-cream rounded-2xl border border-warm px-4 py-3 flex items-center gap-3 group">
                  <span className="text-xl shrink-0">{exp.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-brown text-sm">{exp.title}</p>
                    <p className="text-xs text-brown-light">{exp.category}</p>
                  </div>
                  <p className="font-display text-brown font-bold shrink-0">€{exp.amount.toFixed(2)}</p>
                  <button onClick={() => deleteExpense(exp.id)} className="opacity-0 group-hover:opacity-100 text-rose transition-opacity shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== DAGBOEK ===== */}
      {tab === "dagboek" && (
        <div>
          <div className="flex flex-col gap-6 mb-6">
            {dagboek.length === 0 && (
              <div className="text-center py-12">
                <p className="font-handwriting text-xl text-brown-light">Begin je reisverhaal ✍️</p>
              </div>
            )}
            {dagboek.map((block) => (
              <div key={block.id} className="group relative">
                {block.type === "text" ? (
                  <div className="bg-cream rounded-3xl p-6 border border-warm">
                    <p className="text-brown leading-relaxed whitespace-pre-wrap">{(block as TextBlock).content}</p>
                  </div>
                ) : (
                  <div className="rounded-3xl overflow-hidden">
                    <NextImage src={(block as PhotoBlock).content} alt={(block as PhotoBlock).caption || ""} width={800} height={500} className="w-full object-cover" />
                    {(block as PhotoBlock).caption && (
                      <div className="bg-warm px-5 py-3">
                        <p className="font-handwriting text-lg text-brown">{(block as PhotoBlock).caption}</p>
                      </div>
                    )}
                  </div>
                )}
                <button onClick={() => deleteBlock(block.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 bg-rose/90 text-cream rounded-xl p-1.5 hover:bg-rose transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <input ref={fileRef} type="file" accept="image/*" onChange={addPhoto} className="hidden" />

          {addingBlock === "text" ? (
            <div className="bg-warm rounded-3xl p-5 border border-warm mb-4">
              <textarea value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="Schrijf hier je verhaal..." rows={5} autoFocus className="w-full bg-cream rounded-xl border border-warm px-4 py-3 text-sm text-brown focus:outline-none focus:border-terracotta resize-none mb-3" />
              <div className="flex gap-2">
                <button onClick={addText} className="flex-1 bg-terracotta text-cream rounded-xl py-2 text-sm font-semibold hover:bg-terracotta/80">Toevoegen</button>
                <button onClick={() => setAddingBlock(null)} className="flex-1 bg-cream text-brown-light rounded-xl py-2 text-sm hover:bg-warm">Annuleren</button>
              </div>
            </div>
          ) : addingBlock === "photo" ? (
            <div className="bg-warm rounded-3xl p-5 border border-warm mb-4">
              <input value={newCaption} onChange={(e) => setNewCaption(e.target.value)} placeholder="Bijschrift (optioneel)..." className="w-full bg-cream rounded-xl border border-warm px-4 py-2 text-sm text-brown focus:outline-none focus:border-terracotta mb-3" />
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex-1 flex items-center justify-center gap-2 bg-terracotta text-cream rounded-xl py-2 text-sm font-semibold hover:bg-terracotta/80 disabled:opacity-50">
                  <Upload size={14} /> {uploading ? "Uploaden..." : "Foto kiezen"}
                </button>
                <button onClick={() => setAddingBlock(null)} className="flex-1 bg-cream text-brown-light rounded-xl py-2 text-sm hover:bg-warm">Annuleren</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => setAddingBlock("text")} className="flex-1 flex items-center justify-center gap-2 bg-warm border-2 border-dashed border-warm hover:border-terracotta hover:bg-terracotta/10 text-brown-light hover:text-terracotta rounded-3xl py-4 text-sm font-semibold transition-all">
                ✍️ Tekst
              </button>
              <button onClick={() => setAddingBlock("photo")} className="flex-1 flex items-center justify-center gap-2 bg-warm border-2 border-dashed border-warm hover:border-rose hover:bg-rose/10 text-brown-light hover:text-rose rounded-3xl py-4 text-sm font-semibold transition-all">
                📷 Foto
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

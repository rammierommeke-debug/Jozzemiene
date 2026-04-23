"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Heart, Sun, Calendar, Image, Plus, X, Settings, Check, ChevronLeft, ChevronRight, BookOpen, Quote, AlignJustify, Columns } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { nl } from "date-fns/locale";

// ── Types ─────────────────────────────────────────────────────────────────────

type WidgetType = "greeting" | "weather" | "notes" | "quicklinks" | "upcoming" | "photo-carousel" | "diary" | "quote";
type WidgetWidth = "full" | "half";

interface WidgetConfig {
  id: string;
  type: WidgetType;
  width: WidgetWidth;
  albumId?: string;
  quoteText?: string;
  quoteAuthor?: string;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "greeting", type: "greeting", width: "full" },
  { id: "weather", type: "weather", width: "full" },
  { id: "upcoming", type: "upcoming", width: "half" },
  { id: "notes", type: "notes", width: "half" },
  { id: "quicklinks", type: "quicklinks", width: "full" },
];

const WIDGET_META: Record<WidgetType, { label: string; emoji: string; desc: string }> = {
  "greeting":       { label: "Begroeting",       emoji: "👋", desc: "Goedemorgen/middag/avond met datum" },
  "weather":        { label: "Weer",              emoji: "🌤️", desc: "Weersvoorspelling voor de week" },
  "notes":          { label: "Notities",          emoji: "📝", desc: "Gele plakbriefjes om niet te vergeten" },
  "quicklinks":     { label: "Snelkoppelingen",   emoji: "🔗", desc: "Knoppen naar andere pagina's" },
  "upcoming":       { label: "Agenda",            emoji: "📅", desc: "Komende afspraken" },
  "photo-carousel": { label: "Foto carrousel",    emoji: "🖼️", desc: "Foto's uit een album in een carrousel" },
  "diary":          { label: "Dagboek",           emoji: "📖", desc: "Privé dagboekje voor jezelf" },
  "quote":          { label: "Quote",             emoji: "💬", desc: "Een citaat of mooie tekst" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOTE_COLORS = [
  { value: "geel",  bg: "#fef9c3", border: "#fde047" },
  { value: "roze",  bg: "#fce7f3", border: "#f9a8d4" },
  { value: "groen", bg: "#dcfce7", border: "#86efac" },
  { value: "blauw", bg: "#dbeafe", border: "#93c5fd" },
];

const QUICK_LINKS = [
  { href: "/kalender",  emoji: "📅", label: "Kalender",       color: "bg-sage-light" },
  { href: "/fotos",     emoji: "📸", label: "Foto's",         color: "bg-rose-light" },
  { href: "/sparen",    emoji: "🐷", label: "Sparen",         color: "bg-warm" },
  { href: "/ideetjes",  emoji: "💡", label: "Ideetjes",       color: "bg-terracotta-light/30" },
  { href: "/menu",      emoji: "🍽️", label: "Menu",           color: "bg-sage-light/40" },
  { href: "/reizen",    emoji: "✈️", label: "Reizen",         color: "bg-blue-100" },
];

function weatherIcon(code: number) {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { data: session, status } = useSession();
  const user = (session?.user?.name as "roel" | "emma" | null) ?? null;
  const userRef = useRef<"roel" | "emma" | null>(null);
  const widgetsRef = useRef<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [editMode, setEditMode] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const widgetKey = (u: string) => `home_widgets_v2_${u}`;

  useEffect(() => {
    if (!user) return;
    try {
      const saved = localStorage.getItem(widgetKey(user));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every((w: WidgetConfig) => w.id && w.type && w.width)) {
          widgetsRef.current = parsed;
          setWidgets(parsed);
        } else {
          localStorage.removeItem(widgetKey(user));
        }
      }
    } catch {
      localStorage.removeItem(widgetKey(user));
    }
  }, [user]);

  useEffect(() => { userRef.current = user; }, [user]);

  function reset() {
    if (user) localStorage.removeItem(widgetKey(user));
    widgetsRef.current = DEFAULT_WIDGETS;
    setWidgets(DEFAULT_WIDGETS);
    setSelectedIdx(null);
  }

  function save(next: WidgetConfig[]) {
    widgetsRef.current = next;
    setWidgets(next);
    if (user) localStorage.setItem(widgetKey(user), JSON.stringify(next));
  }

  function removeWidget(id: string) { save(widgets.filter(w => w.id !== id)); }
  function updateWidget(id: string, patch: Partial<WidgetConfig>) {
    save(widgets.map(w => w.id === id ? { ...w, ...patch } : w));
  }
  function toggleWidth(id: string) {
    save(widgets.map(w => w.id === id ? { ...w, width: w.width === "full" ? "half" : "full" } : w));
  }
  function addWidget(type: WidgetType) {
    const id = type + "_" + Date.now();
    save([...widgets, { id, type, width: "full" }]);
    setShowPicker(false);
  }

  function handleWidgetClick(idx: number) {
    if (!editMode) return;
    if (selectedIdx === null) {
      setSelectedIdx(idx);
    } else if (selectedIdx === idx) {
      setSelectedIdx(null);
    } else {
      const next = [...widgets];
      [next[selectedIdx], next[idx]] = [next[idx], next[selectedIdx]];
      save(next);
      setSelectedIdx(null);
    }
  }

  // ── Layout grouping (pair consecutive halves) ─────────────────────────────
  function renderRows() {
    const rows: ReactNode[] = [];
    let i = 0;
    while (i < widgets.length) {
      const w = widgets[i];
      if (w.width === "half" && i + 1 < widgets.length && widgets[i + 1].width === "half") {
        const a = i, b = i + 1;
        rows.push(
          <div key={`row-${a}`} className="grid grid-cols-2 gap-4">
            {([a, b] as const).map(idx => (
              <WidgetShell key={widgets[idx].id} widget={widgets[idx]} editMode={editMode}
                isSelected={selectedIdx === idx}
                hasSelection={selectedIdx !== null}
                onClick={() => handleWidgetClick(idx)}
                onRemove={() => removeWidget(widgets[idx].id)}
                onToggleWidth={() => toggleWidth(widgets[idx].id)}
                onUpdate={patch => updateWidget(widgets[idx].id, patch)}
              />
            ))}
          </div>
        );
        i += 2;
      } else {
        const idx = i;
        rows.push(
          <WidgetShell key={w.id} widget={w} editMode={editMode}
            isSelected={selectedIdx === idx}
            hasSelection={selectedIdx !== null}
            onClick={() => handleWidgetClick(idx)}
            onRemove={() => removeWidget(w.id)}
            onToggleWidth={() => toggleWidth(w.id)}
            onUpdate={patch => updateWidget(w.id, patch)}
          />
        );
        i += 1;
      }
    }
    return rows;
  }

  if (status === "loading") return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-terracotta/30 border-t-terracotta rounded-full animate-spin" />
    </div>
  );

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="soft-panel relative mb-6 overflow-hidden rounded-[2rem] px-5 py-5 md:px-7 md:py-6">
        <div className="petal-dot right-8 top-3 h-24 w-24" />
        <div className="petal-dot bottom-0 left-10 h-20 w-20" />
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-brown-light">Jullie plekje</p>
            <h1 className="font-display text-3xl text-brown md:text-4xl">Welkom terug 🌸</h1>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="rounded-full bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-terracotta shadow-sm">Home</span>
            <span className="rounded-full bg-sage/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sage">Gezellig</span>
          </div>
        </div>
      </div>

      {/* Edit bar */}
      <div className="soft-panel flex flex-col gap-3 mb-6 rounded-[1.75rem] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
        <div>
          {editMode && selectedIdx !== null && (
            <p className="text-xs text-terracotta font-semibold animate-pulse">
              ✦ {WIDGET_META[widgets[selectedIdx].type].label} geselecteerd — klik een andere widget om te swappen
            </p>
          )}
          {editMode && selectedIdx === null && (
            <p className="text-xs text-brown-light">Klik een widget om hem te verplaatsen</p>
          )}
          {!editMode && (
            <p className="text-xs text-brown-light">Pas de volgorde van je widgets aan wanneer je wil.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editMode && (
            <button onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/75 text-brown-light text-xs font-semibold hover:text-rose transition-colors border border-white/60">
              ↺ Reset
            </button>
          )}
          {editMode && (
            <button onClick={() => setShowPicker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sage text-cream text-xs font-semibold hover:bg-sage/80 transition-colors">
              <Plus size={13} /> Widget toevoegen
            </button>
          )}
          <button onClick={() => { setEditMode(!editMode); setSelectedIdx(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${editMode ? "bg-terracotta text-cream border-terracotta" : "bg-cream text-brown-light border-warm hover:border-brown-light"}`}>
            {editMode ? <><Check size={13} /> Klaar</> : <><Settings size={13} /> Aanpassen</>}
          </button>
        </div>
      </div>

      {/* Widget rows */}
      <div className="flex flex-col gap-5">
        {renderRows()}
      </div>

      {/* Widget picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
          onClick={() => setShowPicker(false)}>
          <div className="soft-panel rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-warm">
              <p className="font-display text-lg text-brown">Widget toevoegen</p>
              <button onClick={() => setShowPicker(false)} className="text-brown-light hover:text-rose"><X size={18} /></button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {(Object.entries(WIDGET_META) as [WidgetType, typeof WIDGET_META[WidgetType]][]).map(([type, meta]) => (
                <button key={type} onClick={() => addWidget(type)}
                  className="flex flex-col items-start gap-1 p-4 rounded-2xl bg-warm hover:bg-terracotta/10 hover:border-terracotta border-2 border-transparent transition-all text-left">
                  <span className="text-2xl">{meta.emoji}</span>
                  <p className="text-sm font-semibold text-brown">{meta.label}</p>
                  <p className="text-xs text-brown-light leading-snug">{meta.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Widget Shell (drag wrapper + edit controls) ───────────────────────────────

function WidgetShell({ widget, editMode, isSelected, hasSelection, onClick, onRemove, onToggleWidth, onUpdate }: {
  widget: WidgetConfig; editMode: boolean; isSelected: boolean; hasSelection: boolean;
  onClick: () => void; onRemove: () => void; onToggleWidth: () => void;
  onUpdate: (patch: Partial<WidgetConfig>) => void;
}) {
  const ringClass = isSelected
    ? "ring-2 ring-terracotta shadow-lg scale-[1.01]"
    : editMode && hasSelection
    ? "ring-2 ring-dashed ring-terracotta/40 hover:ring-terracotta hover:scale-[1.01] cursor-pointer"
    : editMode
    ? "ring-2 ring-dashed ring-brown-light/30 hover:ring-terracotta/50 cursor-pointer"
    : "";

  return (
    <div className={`widget-card group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(107,76,59,0.10)] ${ringClass}`}
      onClick={editMode ? onClick : undefined}
    >
      {/* Edit controls */}
      {editMode && (
        <div className="absolute top-2 right-2 z-20 flex gap-1.5" onClick={e => e.stopPropagation()}>
          <button onClick={onToggleWidth} title={widget.width === "full" ? "Half breedte" : "Volle breedte"}
            className="w-7 h-7 bg-cream border border-warm rounded-lg flex items-center justify-center text-brown-light hover:text-terracotta transition-colors shadow-sm">
            {widget.width === "full" ? <Columns size={13} /> : <AlignJustify size={13} />}
          </button>
          <button onClick={onRemove}
            className="w-7 h-7 bg-cream border border-warm rounded-lg flex items-center justify-center text-brown-light hover:text-rose transition-colors shadow-sm">
            <X size={13} />
          </button>
        </div>
      )}
      {editMode && isSelected && (
        <div className="absolute top-2 left-2 z-20 bg-terracotta text-cream rounded-lg px-2 py-1 text-[10px] font-bold shadow-sm">
          ✦ geselecteerd
        </div>
      )}
      <WidgetContent widget={widget} editMode={editMode} onUpdate={onUpdate} />
    </div>
  );
}

// ── Widget Content Router ─────────────────────────────────────────────────────

function WidgetContent({ widget, editMode, onUpdate }: { widget: WidgetConfig; editMode: boolean; onUpdate: (patch: Partial<WidgetConfig>) => void }) {
  switch (widget.type) {
    case "greeting":       return <GreetingWidget />;
    case "weather":        return <WeatherWidget />;
    case "notes":          return <NotesWidget />;
    case "quicklinks":     return <QuickLinksWidget />;
    case "upcoming":       return <UpcomingWidget />;
    case "photo-carousel": return <PhotoCarouselWidget albumId={widget.albumId} onUpdate={onUpdate} />;
    case "diary":          return <DiaryWidget widgetId={widget.id} />;
    case "quote":          return <QuoteWidget initial={{ text: widget.quoteText ?? "", author: widget.quoteAuthor ?? "" }} onUpdate={onUpdate} />;
    default:               return null;
  }
}

// ── Greeting ──────────────────────────────────────────────────────────────────

function GreetingWidget() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 6 ? "Goeienacht" : hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
  const dateStr = now.toLocaleDateString("nl-NL", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return (
    <div className="relative overflow-hidden px-5 py-5 md:px-6 md:py-6">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-terracotta/10 via-rose-light/20 to-sage-light/20" />
      <div className="absolute -right-6 top-3 h-24 w-24 rounded-full bg-white/35 blur-xl" />
      <div className="relative flex flex-wrap items-center gap-3 mb-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 shadow-sm">
          <Sun className="text-terracotta" size={24} />
        </div>
        <h1 className="font-display text-4xl text-brown md:text-5xl">{greeting}</h1>
        <Heart className="text-rose fill-rose" size={22} />
      </div>
      <p className="font-handwriting text-2xl text-brown-light capitalize">{dateStr}</p>
    </div>
  );
}

// ── Weather ───────────────────────────────────────────────────────────────────

function WeatherWidget() {
  const [weather, setWeather] = useState<{ date: string; code: number; max: number; min: number }[]>([]);
  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=51.02&longitude=3.38&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FBrussels&forecast_days=7")
      .then(r => r.json()).then(d => {
        setWeather(d.daily.time.map((date: string, i: number) => ({
          date, code: d.daily.weathercode[i],
          max: Math.round(d.daily.temperature_2m_max[i]),
          min: Math.round(d.daily.temperature_2m_min[i]),
        })));
      }).catch(() => {});
  }, []);
  if (!weather.length) return null;
  return (
    <div className="overflow-hidden rounded-3xl">
      <div className="bg-gradient-to-r from-sage/14 via-white/20 to-terracotta/10 px-4 pt-4 pb-3">
        <p className="text-xs font-semibold text-brown-light uppercase tracking-[0.18em]">Ruiselede — deze week</p>
      </div>
      <div className="grid grid-cols-7 divide-x divide-white/60 overflow-x-auto">
        {weather.map((day, i) => {
          const d = new Date(day.date);
          const label = i === 0 ? "Vand." : i === 1 ? "Morg." : d.toLocaleDateString("nl-NL", { weekday: "short" }).slice(0, 2);
          return (
            <div key={day.date} className={`flex flex-col items-center py-4 gap-1.5 ${i === 0 ? "bg-terracotta/10" : "bg-white/35"}`}>
              <span className="text-[10px] font-semibold text-brown-light capitalize">{label}</span>
              <span className="text-2xl">{weatherIcon(day.code)}</span>
              <span className="text-sm font-bold text-brown">{day.max}°</span>
              <span className="text-[10px] text-brown-light">{day.min}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Quick Links ───────────────────────────────────────────────────────────────

function QuickLinksWidget() {
  return (
    <div className="p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold text-brown-light uppercase tracking-[0.18em]">Snelkoppelingen</p>
        <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-brown-light">favorieten</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {QUICK_LINKS.map(l => (
          <Link key={l.href} href={l.href}
            className={`${l.color} rounded-[1.35rem] p-3.5 flex flex-col items-center gap-2 border border-white/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/65 text-2xl shadow-sm">{l.emoji}</span>
            <span className="text-[11px] font-semibold text-brown text-center leading-tight">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Upcoming Events ───────────────────────────────────────────────────────────

function UpcomingWidget() {
  const [events, setEvents] = useState<{ id: string; title: string; date: string; time: string | null; person: string }[]>([]);
  useEffect(() => {
    fetch("/api/events").then(r => r.json()).then(data => {
      if (!Array.isArray(data)) return;
      const upcoming = data
        .filter((e: { date: string }) => e.date >= format(new Date(), "yyyy-MM-dd"))
        .sort((a: { date: string; time: string }, b: { date: string; time: string }) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""))
        .slice(0, 4);
      setEvents(upcoming);
    }).catch(() => {});
  }, []);
  return (
    <div className="p-4 h-full md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage/12">
          <Calendar size={16} className="text-sage" />
        </div>
        <p className="text-xs font-semibold text-brown-light uppercase tracking-[0.18em]">Komende afspraken</p>
      </div>
      {events.length === 0
        ? <p className="text-sm text-brown-light italic">Geen geplande afspraken 🌿</p>
        : <ul className="flex flex-col gap-2.5">
            {events.map(ev => {
              const d = parseISO(ev.date);
              const dayLabel = isToday(d) ? "Vandaag" : isTomorrow(d) ? "Morgen" : format(d, "EEE d MMM", { locale: nl });
              return (
                <li key={ev.id} className="flex items-start gap-3 rounded-2xl bg-white/55 px-3 py-3 border border-white/60">
                  <span className="text-[10px] font-bold text-sage bg-sage/12 rounded-xl px-2 py-1 mt-0.5 whitespace-nowrap capitalize">{dayLabel}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brown leading-tight">{ev.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-brown-light">
                      {ev.time && <p>{ev.time}</p>}
                      {ev.person && <p className="rounded-full bg-rose-light/35 px-2 py-0.5">{ev.person}</p>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
      }
    </div>
  );
}

// ── Notes ─────────────────────────────────────────────────────────────────────

function NotesWidget() {
  const [notes, setNotes] = useState<{ id: string; text: string; color: string }[]>([]);
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [newColor, setNewColor] = useState("geel");
  useEffect(() => {
    fetch("/api/notes").then(r => r.json()).then(d => { if (Array.isArray(d)) setNotes(d); }).catch(() => {});
  }, []);
  async function add() {
    if (!newText.trim()) return;
    const note = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: newText.trim(), color: newColor }) }).then(r => r.json());
    setNotes(prev => [note, ...prev]);
    setNewText(""); setAdding(false);
  }
  async function del(id: string) {
    setNotes(prev => prev.filter(n => n.id !== id));
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
  }
  const colorStyle = NOTE_COLORS.find(c => c.value === newColor) ?? NOTE_COLORS[0];
  return (
    <div className="p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-brown-light uppercase tracking-wide">📝 Niet vergeten</p>
        <button onClick={() => setAdding(!adding)} className="w-6 h-6 rounded-full bg-warm flex items-center justify-center text-brown-light hover:text-terracotta transition-colors">
          <Plus size={13} />
        </button>
      </div>
      {adding && (
        <div className="rounded-2xl p-3 mb-3 border-2" style={{ backgroundColor: colorStyle.bg, borderColor: colorStyle.border }}>
          <div className="flex gap-1.5 mb-2">
            {NOTE_COLORS.map(c => (
              <button key={c.value} onClick={() => setNewColor(c.value)}
                style={{ backgroundColor: c.bg, borderColor: newColor === c.value ? "#6b4c3b" : c.border }}
                className="w-5 h-5 rounded-full border-2 transition-all" />
            ))}
          </div>
          <textarea value={newText} onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); add(); } }}
            placeholder="Schrijf je notitie..." autoFocus rows={2}
            style={{ color: "#6b4c3b", backgroundColor: "transparent" }}
            className="w-full focus:outline-none resize-none font-handwriting text-base" />
          <div className="flex gap-2 mt-1">
            <button onClick={add} style={{ backgroundColor: colorStyle.border }} className="flex-1 rounded-xl py-1 text-xs font-semibold text-brown">Plakken</button>
            <button onClick={() => { setAdding(false); setNewText(""); }} className="flex-1 bg-warm text-brown-light rounded-xl py-1 text-xs">Annuleren</button>
          </div>
        </div>
      )}
      {notes.length === 0 && !adding
        ? <p className="text-sm text-brown-light font-handwriting">Niets te onthouden 🌿</p>
        : <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
            {notes.map(note => {
              const s = NOTE_COLORS.find(c => c.value === note.color) ?? NOTE_COLORS[0];
              return (
                <div key={note.id} className="rounded-xl p-2.5 relative" style={{ backgroundColor: s.bg, border: `1.5px solid ${s.border}` }}>
                  <p className="font-handwriting text-base leading-snug pr-5 whitespace-pre-wrap" style={{ color: "#6b4c3b" }}>{note.text}</p>
                  <button onClick={() => del(note.id)} className="absolute top-2 right-2" style={{ color: "#9a7060" }}><X size={12} /></button>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}

// ── Photo Carousel ────────────────────────────────────────────────────────────

function PhotoCarouselWidget({ albumId, onUpdate }: { albumId?: string; onUpdate: (patch: Partial<WidgetConfig>) => void }) {
  const [photos, setPhotos] = useState<{ id: string; url: string; caption: string }[]>([]);
  const [albums, setAlbums] = useState<{ id: string; name: string; emoji: string }[]>([]);
  const [chosenAlbum, setChosenAlbum] = useState(albumId ?? "");
  const [idx, setIdx] = useState(0);
  const [picking, setPicking] = useState(!albumId);

  useEffect(() => {
    fetch("/api/albums").then(r => r.json()).then(d => { if (Array.isArray(d)) setAlbums(d); });
  }, []);

  useEffect(() => {
    if (!chosenAlbum) return;
    fetch("/api/photos").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setPhotos(d.filter((p: { album_id: string }) => p.album_id === chosenAlbum));
    });
    onUpdate({ albumId: chosenAlbum });
  }, [chosenAlbum]);

  if (picking) return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-3"><Image size={16} className="text-rose" /><p className="text-sm font-semibold text-brown">Kies een album</p></div>
      <div className="flex flex-wrap gap-2">
        {albums.map(a => (
          <button key={a.id} onClick={() => { setChosenAlbum(a.id); setPicking(false); }}
            className="px-3 py-1.5 rounded-full bg-cream border border-warm text-xs font-semibold text-brown hover:border-rose transition-colors">
            {a.emoji} {a.name}
          </button>
        ))}
        {albums.length === 0 && <p className="text-sm text-brown-light italic">Nog geen albums aangemaakt</p>}
      </div>
    </div>
  );

  if (!photos.length) return (
    <div className="p-5 flex items-center justify-center h-40">
      <p className="text-sm text-brown-light italic">Geen foto's in dit album</p>
    </div>
  );

  const photo = photos[idx];
  return (
    <div className="overflow-hidden rounded-3xl">
      <div className="relative">
        <NextImage src={photo.url} alt={photo.caption || ""} width={800} height={400}
          className="w-full h-56 object-cover" />
        <div className="absolute inset-0 flex items-center justify-between px-2">
          <button onClick={() => setIdx((idx - 1 + photos.length) % photos.length)}
            className="w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50 transition-colors backdrop-blur-sm">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setIdx((idx + 1) % photos.length)}
            className="w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50 transition-colors backdrop-blur-sm">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
          {photos.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-white scale-125" : "bg-white/50"}`} />
          ))}
        </div>
      </div>
      {photo.caption && (
        <p className="font-handwriting text-lg text-brown px-4 py-2">{photo.caption}</p>
      )}
    </div>
  );
}

// ── Diary ─────────────────────────────────────────────────────────────────────

function DiaryWidget({ widgetId }: { widgetId: string }) {
  const key = `diary_${widgetId}`;
  const [entries, setEntries] = useState<{ id: string; date: string; text: string }[]>([]);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    try { const d = localStorage.getItem(key); if (d) setEntries(JSON.parse(d)); } catch {}
  }, [key]);

  function save(next: typeof entries) {
    setEntries(next);
    localStorage.setItem(key, JSON.stringify(next));
  }

  function add() {
    if (!text.trim()) return;
    save([{ id: Date.now().toString(), date: new Date().toISOString(), text: text.trim() }, ...entries]);
    setText(""); setAdding(false);
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><BookOpen size={15} className="text-rose" /><p className="text-xs font-semibold text-brown-light uppercase tracking-wide">Dagboek</p></div>
        <button onClick={() => setAdding(!adding)} className="w-6 h-6 rounded-full bg-rose/20 flex items-center justify-center text-rose hover:bg-rose/30 transition-colors"><Plus size={13} /></button>
      </div>
      {adding && (
        <div className="mb-3">
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Schrijf je gedachten..." autoFocus rows={3}
            className="w-full bg-cream/80 rounded-2xl border border-rose-light/50 px-3 py-2 text-sm text-brown focus:outline-none focus:border-rose font-handwriting text-base resize-none" />
          <div className="flex gap-2 mt-2">
            <button onClick={add} className="flex-1 bg-rose text-cream rounded-xl py-1.5 text-xs font-semibold hover:bg-rose/80">Opslaan</button>
            <button onClick={() => { setAdding(false); setText(""); }} className="flex-1 bg-warm text-brown-light rounded-xl py-1.5 text-xs">Annuleren</button>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
        {entries.length === 0 && !adding && <p className="text-sm text-brown-light italic font-handwriting">Jouw privé dagboek ✨</p>}
        {entries.map(e => (
          <div key={e.id} className="bg-cream/60 rounded-2xl px-3 py-2 relative group">
            <p className="text-[10px] text-brown-light mb-1">{format(new Date(e.date), "d MMMM yyyy", { locale: nl })}</p>
            <p className="text-sm font-handwriting text-brown leading-snug whitespace-pre-wrap pr-4">{e.text}</p>
            <button onClick={() => save(entries.filter(x => x.id !== e.id))}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-brown-light hover:text-rose"><X size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Quote ─────────────────────────────────────────────────────────────────────

function QuoteWidget({ initial, onUpdate }: { initial: { text: string; author: string }; onUpdate: (patch: Partial<WidgetConfig>) => void }) {
  const [editing, setEditing] = useState(!initial.text);
  const [text, setText] = useState(initial.text || "Voeg hier een citaat of mooie tekst toe...");
  const [author, setAuthor] = useState(initial.author || "");

  function save() {
    onUpdate({ quoteText: text, quoteAuthor: author });
    setEditing(false);
  }

  if (editing) return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-3"><Quote size={15} className="text-brown-light" /><p className="text-xs font-semibold text-brown-light uppercase tracking-wide">Quote bewerken</p></div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Citaat of tekst..."
        className="w-full bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-sage font-handwriting text-lg resize-none mb-2" />
      <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="— Bron of naam (optioneel)"
        className="w-full bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-sage mb-3" />
      <button onClick={save} className="w-full bg-sage text-cream rounded-xl py-2 text-sm font-semibold hover:bg-sage/80">Opslaan</button>
    </div>
  );

  return (
    <div onClick={() => setEditing(true)} className="p-6 cursor-pointer hover:bg-terracotta/5 transition-colors group rounded-3xl">
      <Quote size={20} className="text-terracotta/50 mb-2" />
      <p className="font-handwriting text-2xl text-brown leading-relaxed">{text}</p>
      {author && <p className="text-sm text-brown-light mt-2 text-right">{author}</p>}
      <p className="text-[10px] text-brown-light/50 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Klik om te bewerken</p>
    </div>
  );
}

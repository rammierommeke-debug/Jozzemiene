"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Heart, Sun, Calendar, Image, Plus, X, GripVertical, Settings, Check, ChevronLeft, ChevronRight, BookOpen, Quote, AlignJustify, Columns } from "lucide-react";
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
  const [user, setUser] = useState<"roel" | "emma" | null>(null);
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [editMode, setEditMode] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const touchDragIdx = useRef<number | null>(null);
  const [touchGhost, setTouchGhost] = useState<{ x: number; y: number; label: string } | null>(null);
  const [crashed, setCrashed] = useState(false);

  const widgetKey = (u: string) => `home_widgets_v2_${u}`;

  useEffect(() => {
    const savedUser = localStorage.getItem("home_user") as "roel" | "emma" | null;
    setUser(savedUser);
    if (!savedUser) return;
    try {
      const saved = localStorage.getItem(widgetKey(savedUser));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every((w: WidgetConfig) => w.id && w.type && w.width)) {
          setWidgets(parsed);
        } else {
          localStorage.removeItem(widgetKey(savedUser));
        }
      }
    } catch {
      localStorage.removeItem(widgetKey(savedUser));
    }
  }, []);

  function chooseUser(u: "roel" | "emma") {
    localStorage.setItem("home_user", u);
    setUser(u);
  }

  function reset() {
    if (user) localStorage.removeItem(widgetKey(user));
    setWidgets(DEFAULT_WIDGETS);
    setCrashed(false);
  }

  function save(next: WidgetConfig[]) {
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

  // ── Desktop DnD ───────────────────────────────────────────────────────────
  function onDragStart(i: number) { setDragIdx(i); }
  function onDragOver(e: React.DragEvent, i: number) { e.preventDefault(); setDragOverIdx(i); }
  function onDrop(i: number) {
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return; }
    const next = [...widgets];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(i, 0, moved);
    save(next);
    setDragIdx(null); setDragOverIdx(null);
  }

  // ── Touch DnD ─────────────────────────────────────────────────────────────
  const onTouchStartW = useCallback((i: number, e: React.TouchEvent) => {
    touchDragIdx.current = i;
    const t = e.touches[0];
    setTouchGhost({ x: t.clientX, y: t.clientY, label: WIDGET_META[widgets[i].type].emoji + " " + WIDGET_META[widgets[i].type].label });
  }, [widgets]);

  const onTouchMoveW = useCallback((e: React.TouchEvent) => {
    if (touchDragIdx.current === null) return;
    e.preventDefault();
    const t = e.touches[0];
    setTouchGhost(prev => prev ? { ...prev, x: t.clientX, y: t.clientY } : null);
    const el = document.elementFromPoint(t.clientX, t.clientY)?.closest("[data-widget-idx]") as HTMLElement | null;
    setDragOverIdx(el ? Number(el.dataset.widgetIdx) : null);
  }, []);

  const onTouchEndW = useCallback(() => {
    if (touchDragIdx.current !== null && dragOverIdx !== null && touchDragIdx.current !== dragOverIdx) {
      setWidgets(prev => {
        const next = [...prev];
        const [moved] = next.splice(touchDragIdx.current!, 1);
        next.splice(dragOverIdx, 0, moved);
        if (user) localStorage.setItem(widgetKey(user), JSON.stringify(next));
        return next;
      });
    }
    touchDragIdx.current = null;
    setTouchGhost(null);
    setDragOverIdx(null);
  }, [dragOverIdx, user]);

  // ── Layout grouping (pair consecutive halves) ─────────────────────────────
  function renderRows() {
    const rows: ReactNode[] = [];
    let i = 0;
    while (i < widgets.length) {
      const w = widgets[i];
      const isDragOver = dragOverIdx === i;
      if (w.width === "half" && i + 1 < widgets.length && widgets[i + 1].width === "half") {
        rows.push(
          <div key={`row-${i}`} className="grid grid-cols-2 gap-4">
            {[widgets[i], widgets[i + 1]].map((ww, offset) => (
              <WidgetShell key={ww.id} widget={ww} idx={i + offset} editMode={editMode}
                isDragOver={dragOverIdx === i + offset}
                onRemove={() => removeWidget(ww.id)}
                onToggleWidth={() => toggleWidth(ww.id)}
                onUpdate={patch => updateWidget(ww.id, patch)}
                onDragStart={() => onDragStart(i + offset)}
                onDragOver={e => onDragOver(e, i + offset)}
                onDrop={() => onDrop(i + offset)}
                onTouchStart={e => onTouchStartW(i + offset, e)}
                onTouchMove={onTouchMoveW}
                onTouchEnd={onTouchEndW}
              />
            ))}
          </div>
        );
        i += 2;
      } else {
        rows.push(
          <WidgetShell key={w.id} widget={w} idx={i} editMode={editMode}
            isDragOver={isDragOver}
            onRemove={() => removeWidget(w.id)}
            onToggleWidth={() => toggleWidth(w.id)}
            onUpdate={patch => updateWidget(w.id, patch)}
            onDragStart={() => onDragStart(i)}
            onDragOver={e => onDragOver(e, i)}
            onDrop={() => onDrop(i)}
            onTouchStart={e => onTouchStartW(i, e)}
            onTouchMove={onTouchMoveW}
            onTouchEnd={onTouchEndW}
          />
        );
        i += 1;
      }
    }
    return rows;
  }

  if (!user) return (
    <div className="max-w-sm mx-auto pt-24 px-4 flex flex-col items-center gap-6">
      <div className="text-center">
        <p className="text-5xl mb-3">🏠</p>
        <h1 className="font-display text-3xl text-brown mb-1">Jouw home</h1>
        <p className="text-brown-light text-sm">Wie ben jij? Elke persoon heeft zijn eigen pagina.</p>
      </div>
      <div className="flex gap-4 w-full">
        {(["emma", "roel"] as const).map(u => (
          <button key={u} onClick={() => chooseUser(u)}
            className={`flex-1 rounded-2xl py-5 font-display text-xl border-2 transition-all hover:scale-105 ${u === "emma" ? "bg-rose/10 border-rose/30 text-rose" : "bg-blue-50 border-blue-200 text-blue-500"}`}>
            {u === "emma" ? "Emma" : "Roel"}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto pt-14 md:pt-0 pb-10">

      {/* Touch ghost */}
      {touchGhost && (
        <div className="fixed z-[999] pointer-events-none bg-cream border-2 border-terracotta rounded-2xl px-4 py-2 shadow-2xl text-sm font-semibold text-brown opacity-90"
          style={{ left: touchGhost.x - 60, top: touchGhost.y - 24 }}>
          {touchGhost.label}
        </div>
      )}

      {/* Edit bar */}
      <div className="flex items-center justify-between mb-6">
        <div />
        <button onClick={() => { localStorage.removeItem("home_user"); setUser(null); setEditMode(false); }}
          className={`text-xs text-brown-light hover:text-terracotta transition-colors font-semibold ${user === "emma" ? "text-rose" : "text-blue-400"}`}>
          {user === "emma" ? "Emma" : "Roel"} ↓
        </button>
        <div className="flex items-center gap-2">
          {editMode && (
            <button onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warm text-brown-light text-xs font-semibold hover:text-rose transition-colors border border-warm">
              ↺ Reset
            </button>
          )}
          {editMode && (
            <button onClick={() => setShowPicker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sage text-cream text-xs font-semibold hover:bg-sage/80 transition-colors">
              <Plus size={13} /> Widget toevoegen
            </button>
          )}
          <button onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${editMode ? "bg-terracotta text-cream border-terracotta" : "bg-cream text-brown-light border-warm hover:border-brown-light"}`}>
            {editMode ? <><Check size={13} /> Klaar</> : <><Settings size={13} /> Aanpassen</>}
          </button>
        </div>
      </div>

      {/* Widget rows */}
      <div className="flex flex-col gap-4">
        {crashed
          ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">😵</p>
              <p className="font-display text-xl text-brown mb-2">Er ging iets mis</p>
              <p className="text-sm text-brown-light mb-6">De widget-layout is hersteld naar de standaard.</p>
              <button onClick={reset} className="bg-terracotta text-cream rounded-2xl px-6 py-2.5 font-semibold hover:bg-terracotta/80 transition-colors">
                Herstellen
              </button>
            </div>
          )
          : renderRows()
        }
      </div>

      {/* Widget picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
          onClick={() => setShowPicker(false)}>
          <div className="bg-cream rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
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

function WidgetShell({ widget, idx, editMode, isDragOver, onRemove, onToggleWidth, onUpdate, onDragStart, onDragOver, onDrop, onTouchStart, onTouchMove, onTouchEnd }: {
  widget: WidgetConfig; idx: number; editMode: boolean; isDragOver: boolean;
  onRemove: () => void; onToggleWidth: () => void; onUpdate: (patch: Partial<WidgetConfig>) => void;
  onDragStart: () => void; onDragOver: (e: React.DragEvent) => void; onDrop: () => void;
  onTouchStart: (e: React.TouchEvent) => void; onTouchMove: (e: React.TouchEvent) => void; onTouchEnd: () => void;
}) {
  return (
    <div data-widget-idx={idx}
      className={`relative rounded-3xl transition-all duration-150 ${isDragOver ? "ring-2 ring-terracotta scale-[1.01]" : ""} ${editMode ? "ring-2 ring-dashed ring-brown-light/30" : ""}`}
      style={editMode ? { touchAction: "none" } : undefined}
      draggable={editMode}
      onDragStart={editMode ? onDragStart : undefined}
      onDragOver={editMode ? onDragOver : undefined}
      onDragLeave={editMode ? () => {} : undefined}
      onDrop={editMode ? onDrop : undefined}
      onTouchStart={editMode ? onTouchStart : undefined}
      onTouchMove={editMode ? onTouchMove : undefined}
      onTouchEnd={editMode ? onTouchEnd : undefined}
    >
      {/* Edit overlay controls */}
      {editMode && (
        <div className="absolute top-2 right-2 z-20 flex gap-1.5">
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
      {editMode && (
        <div className="absolute top-2 left-2 z-20">
          <div className="w-7 h-7 bg-cream border border-warm rounded-lg flex items-center justify-center text-brown-light shadow-sm cursor-grab">
            <GripVertical size={13} />
          </div>
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
    <div className="px-1 py-2">
      <div className="flex items-center gap-3 mb-1">
        <Sun className="text-terracotta" size={28} />
        <h1 className="font-display text-4xl text-brown">{greeting}</h1>
        <Heart className="text-rose fill-rose" size={24} />
      </div>
      <p className="font-handwriting text-xl text-brown-light ml-1 capitalize">{dateStr}</p>
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
    <div className="bg-warm rounded-3xl border border-warm/80 overflow-hidden">
      <p className="text-xs font-semibold text-brown-light uppercase tracking-wide px-4 pt-3 pb-1">Ruiselede — deze week</p>
      <div className="grid grid-cols-7 divide-x divide-warm/60">
        {weather.map((day, i) => {
          const d = new Date(day.date);
          const label = i === 0 ? "Vand." : i === 1 ? "Morg." : d.toLocaleDateString("nl-NL", { weekday: "short" }).slice(0, 2);
          return (
            <div key={day.date} className={`flex flex-col items-center py-3 gap-1 ${i === 0 ? "bg-terracotta/10" : ""}`}>
              <span className="text-[10px] font-semibold text-brown-light capitalize">{label}</span>
              <span className="text-xl">{weatherIcon(day.code)}</span>
              <span className="text-xs font-bold text-brown">{day.max}°</span>
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
    <div className="bg-cream rounded-3xl border border-warm p-4">
      <p className="text-xs font-semibold text-brown-light uppercase tracking-wide mb-3">Snelkoppelingen</p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {QUICK_LINKS.map(l => (
          <Link key={l.href} href={l.href}
            className={`${l.color} rounded-2xl p-3 flex flex-col items-center gap-1.5 border border-warm hover:shadow-md hover:-translate-y-0.5 transition-all`}>
            <span className="text-2xl">{l.emoji}</span>
            <span className="text-[10px] font-semibold text-brown text-center leading-tight">{l.label}</span>
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
    <div className="bg-sage-light/30 rounded-3xl border border-warm p-4 h-full">
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={16} className="text-sage" />
        <p className="text-xs font-semibold text-brown-light uppercase tracking-wide">Komende afspraken</p>
      </div>
      {events.length === 0
        ? <p className="text-sm text-brown-light italic">Geen geplande afspraken 🌿</p>
        : <ul className="flex flex-col gap-2">
            {events.map(ev => {
              const d = parseISO(ev.date);
              const dayLabel = isToday(d) ? "Vandaag" : isTomorrow(d) ? "Morgen" : format(d, "EEE d MMM", { locale: nl });
              return (
                <li key={ev.id} className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-sage bg-sage/10 rounded-lg px-1.5 py-1 mt-0.5 whitespace-nowrap capitalize">{dayLabel}</span>
                  <div>
                    <p className="text-sm font-semibold text-brown leading-tight">{ev.title}</p>
                    {ev.time && <p className="text-[10px] text-brown-light">{ev.time}</p>}
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
    <div className="bg-cream rounded-3xl border border-warm p-4 h-full">
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
    <div className="bg-warm rounded-3xl border border-warm p-5">
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
    <div className="bg-warm rounded-3xl border border-warm p-5 flex items-center justify-center h-40">
      <p className="text-sm text-brown-light italic">Geen foto's in dit album</p>
    </div>
  );

  const photo = photos[idx];
  return (
    <div className="bg-cream rounded-3xl border border-warm overflow-hidden">
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
    <div className="bg-rose-light/20 rounded-3xl border border-rose-light/40 p-4">
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
    <div className="bg-warm rounded-3xl border border-warm p-5">
      <div className="flex items-center gap-2 mb-3"><Quote size={15} className="text-brown-light" /><p className="text-xs font-semibold text-brown-light uppercase tracking-wide">Quote bewerken</p></div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Citaat of tekst..."
        className="w-full bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-sage font-handwriting text-lg resize-none mb-2" />
      <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="— Bron of naam (optioneel)"
        className="w-full bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-sage mb-3" />
      <button onClick={save} className="w-full bg-sage text-cream rounded-xl py-2 text-sm font-semibold hover:bg-sage/80">Opslaan</button>
    </div>
  );

  return (
    <div onClick={() => setEditing(true)} className="bg-terracotta/10 border border-terracotta/20 rounded-3xl p-6 cursor-pointer hover:bg-terracotta/15 transition-colors group">
      <Quote size={20} className="text-terracotta/50 mb-2" />
      <p className="font-handwriting text-2xl text-brown leading-relaxed">{text}</p>
      {author && <p className="text-sm text-brown-light mt-2 text-right">{author}</p>}
      <p className="text-[10px] text-brown-light/50 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Klik om te bewerken</p>
    </div>
  );
}

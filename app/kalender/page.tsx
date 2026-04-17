"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Calendar, Plus, Trash2, ChevronLeft, ChevronRight, CalendarDays, Clock, Pencil, X } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO,
} from "date-fns";
import { nl } from "date-fns/locale";

type Person = "Emma" | "Roel" | "Samen";

type Event = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  category: string;
  person: Person;
};

const CATEGORIES = [
  { key: "algemeen",    label: "Algemeen",   icon: "📅", color: "bg-warm text-brown-light" },
  { key: "werk",        label: "Werk",       icon: "💼", color: "bg-blue-100 text-blue-600" },
  { key: "werk-vroeg",  label: "Vroeg",      icon: "🌙", color: "bg-blue-100 text-blue-600" },
  { key: "werk-laat",   label: "Laat",       icon: "☀️", color: "bg-blue-100 text-blue-600" },
  { key: "thuis",       label: "Thuis",      icon: "🏠", color: "bg-terracotta-light/30 text-terracotta" },
  { key: "samen",       label: "Samen",      icon: "💕", color: "bg-rose-light/50 text-rose" },
  { key: "dokter",      label: "Dokter",     icon: "🏥", color: "bg-green-100 text-green-600" },
  { key: "sport",       label: "Sport",      icon: "🏃", color: "bg-sage-light text-sage" },
  { key: "verjaardag",  label: "Verjaardag", icon: "🎂", color: "bg-yellow-100 text-yellow-600" },
  { key: "uitje",       label: "Uitstap",    icon: "✈️", color: "bg-purple-100 text-purple-500" },
];

const WERK_SUBTYPES = [
  { key: "werk-vroeg", label: "Vroeg", icon: "🌙" },
  { key: "werk-laat",  label: "Laat",  icon: "☀️" },
];

const PERSONS: { key: Person; color: string; dot: string }[] = [
  { key: "Emma",  color: "bg-rose text-cream",       dot: "bg-rose" },
  { key: "Roel",  color: "bg-sage text-cream",        dot: "bg-sage" },
  { key: "Samen", color: "bg-orange-400 text-white",  dot: "bg-orange-400" },
];

function getCategoryMeta(key: string) {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[0];
}
function getPersonMeta(key: Person) {
  return PERSONS.find((p) => p.key === key) ?? PERSONS[2];
}

function getEventChipColor(event: Event): string {
  const isWerk = event.category === "werk" || event.category === "werk-vroeg" || event.category === "werk-laat";
  if (isWerk) {
    if (event.person === "Emma") return "bg-green-200 text-green-800";
    if (event.person === "Roel") return "bg-purple-200 text-purple-700";
  }
  return getPersonMeta(event.person).color;
}

export default function KalenderPage() {
  return (
    <Suspense>
      <KalenderInner />
    </Suspense>
  );
}

function KalenderInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode") === "bewerken" ? "bewerken" : "bekijken";
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection
  const [multiMode, setMultiMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  // Form
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newCategory, setNewCategory] = useState("algemeen");
  const [newPerson, setNewPerson] = useState<Person>("Samen");

  // Dag-modal (bekijken view)
  const [modalDay, setModalDay] = useState<Date | null>(null);

  useEffect(() => {
    fetch("/api/events").then((r) => r.json()).then(setEvents).finally(() => setLoading(false));
  }, []);

  // Single selected date (for viewing events) — first selected in single mode
  const focusDate = selectedDates[0] ?? null;

  function handleDayClick(day: Date) {
    if (!multiMode) {
      setSelectedDates([day]);
      return;
    }
    // Toggle de dag aan/uit
    setSelectedDates((prev) =>
      prev.some((d) => isSameDay(d, day))
        ? prev.filter((d) => !isSameDay(d, day))
        : [...prev, day]
    );
  }

  function isDaySelected(day: Date) {
    return selectedDates.some((d) => isSameDay(d, day));
  }

  function clearSelection() {
    setSelectedDates([]);
    setMultiMode(false);
  }

  const eventsOnDay = (day: Date) =>
    events
      .filter((e) => isSameDay(parseISO(e.date), day))
      .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));

  const eventsOnFocus = focusDate ? eventsOnDay(focusDate) : [];

  async function addEvent() {
    if (!newTitle.trim() || selectedDates.length === 0) return;
    const dates = selectedDates.map((d) => format(d, "yyyy-MM-dd"));
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, dates, time: newTime || null, category: newCategory, person: newPerson }),
    });
    const result = await res.json();
    const created: Event[] = Array.isArray(result) ? result : [result];
    setEvents((prev) => [...prev, ...created]);
    setNewTitle("");
    setNewTime("");
  }

  async function deleteEvent(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  const startDay = startOfMonth(currentMonth).getDay();
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });

  const selectedLabel = () => {
    if (selectedDates.length === 0) return null;
    if (selectedDates.length === 1) return format(selectedDates[0], "EEEE d MMMM", { locale: nl });
    return `${format(selectedDates[0], "d MMM", { locale: nl })} – ${format(selectedDates[selectedDates.length - 1], "d MMM", { locale: nl })} (${selectedDates.length} dagen)`;
  };

  const modalEvents = modalDay ? eventsOnDay(modalDay) : [];

  async function addEventToDay(day: Date) {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, dates: [format(day, "yyyy-MM-dd")], time: newTime || null, category: newCategory, person: newPerson }),
    });
    const result = await res.json();
    const created: Event[] = Array.isArray(result) ? result : [result];
    setEvents((prev) => [...prev, ...created]);
    setNewTitle("");
    setNewTime("");
  }

  if (mode === "bekijken") {
    return (
      <div className="max-w-5xl mx-auto pt-14 md:pt-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="text-sage" size={28} />
            <h1 className="font-display text-3xl text-brown">Onze Kalender</h1>
          </div>
          <button
            onClick={() => router.push("/kalender?mode=bewerken")}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-warm border border-warm hover:bg-cream text-brown-light hover:text-terracotta transition-colors text-sm font-semibold"
          >
            <Pencil size={14} /> Bewerken
          </button>
        </div>

        {/* Maand navigatie */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-warm transition-colors">
            <ChevronLeft size={20} className="text-brown" />
          </button>
          <h2 className="font-display text-2xl text-brown capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: nl })}
          </h2>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-warm transition-colors">
            <ChevronRight size={20} className="text-brown" />
          </button>
        </div>

        {/* Weekdagen header */}
        <div className="grid grid-cols-7 mb-1 border-b border-warm">
          {["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"].map((d) => (
            <div key={d} className="text-center text-xs font-bold text-brown-light py-2">{d}</div>
          ))}
        </div>

        {/* Grote kalender grid */}
        <div className="grid grid-cols-7 border-l border-t border-warm">
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`e-${i}`} className="border-r border-b border-warm min-h-[110px] bg-warm/30" />
          ))}
          {days.map((day) => {
            const dayEvents = eventsOnDay(day);
            const today = isToday(day);
            const inMonth = isSameMonth(day, currentMonth);
            return (
              <div
                key={day.toISOString()}
                onClick={() => inMonth && setModalDay(day)}
                className={`border-r border-b border-warm min-h-[110px] p-1.5 flex flex-col gap-0.5 transition-colors
                  ${!inMonth ? "bg-warm/20 opacity-40" : today ? "bg-rose-light/20 cursor-pointer hover:bg-rose-light/40" : "bg-cream cursor-pointer hover:bg-warm/50"}`}
              >
                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-0.5 ${today ? "bg-terracotta text-cream" : "text-brown"}`}>
                  {format(day, "d")}
                </span>
                {dayEvents.map((ev) => {
                  const cat = getCategoryMeta(ev.category);
                  const chipColor = getEventChipColor(ev);
                  return (
                    <div key={ev.id} className={`text-[10px] leading-none rounded px-1.5 py-1 font-medium truncate ${chipColor}`}>
                      {ev.time && <span className="opacity-70 mr-0.5">{ev.time}</span>}
                      {cat.icon} {ev.title}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-2 mt-4">
          <div className="flex items-center gap-1.5 bg-cream rounded-full px-3 py-1 border border-warm">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" /><span className="text-xs text-brown-light">Emma werk</span>
          </div>
          <div className="flex items-center gap-1.5 bg-cream rounded-full px-3 py-1 border border-warm">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /><span className="text-xs text-brown-light">Roel werk</span>
          </div>
          {PERSONS.map((p) => (
            <div key={p.key} className="flex items-center gap-1.5 bg-cream rounded-full px-3 py-1 border border-warm">
              <span className={`w-2.5 h-2.5 rounded-full ${p.dot}`} /><span className="text-xs text-brown-light">{p.key}</span>
            </div>
          ))}
        </div>

        {/* Dag-modal */}
        {modalDay && (
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModalDay(null)}>
            <div className="bg-cream rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-warm">
                <p className="font-display text-xl text-brown capitalize">
                  {format(modalDay, "EEEE d MMMM", { locale: nl })}
                </p>
                <button onClick={() => setModalDay(null)} className="text-brown-light hover:text-rose transition-colors"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                {/* Events */}
                {modalEvents.length === 0 ? (
                  <p className="text-sm text-brown-light italic">Nog geen afspraken op deze dag.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {modalEvents.map((ev) => {
                      const cat = getCategoryMeta(ev.category);
                      return (
                        <li key={ev.id} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${getEventChipColor(ev)}`}>
                          <span className="text-base shrink-0">{cat.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold leading-tight">{ev.title}</p>
                            {ev.time && <p className="text-xs opacity-70 flex items-center gap-1"><Clock size={10} />{ev.time}</p>}
                          </div>
                          <span className="text-xs opacity-70 shrink-0">{ev.person}</span>
                          <button onClick={() => deleteEvent(ev.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                            <Trash2 size={13} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Toevoegen */}
                <div className="border-t border-warm pt-4 flex flex-col gap-3">
                  <p className="text-xs font-semibold text-brown-light uppercase tracking-wide">Afspraak toevoegen</p>
                  <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addEventToDay(modalDay)}
                    placeholder="Naam van de afspraak..."
                    className="bg-warm rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-sage" />
                  <div className="flex gap-2">
                    <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                      className="flex-1 bg-warm rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-sage" />
                    <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                      className="flex-1 bg-warm rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-sage">
                      {CATEGORIES.filter(c => c.key !== "werk-vroeg" && c.key !== "werk-laat").map(c => (
                        <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                      ))}
                      {WERK_SUBTYPES.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    {PERSONS.map(p => (
                      <button key={p.key} onClick={() => setNewPerson(p.key)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${newPerson === p.key ? p.color + " shadow-sm" : "bg-warm text-brown-light hover:bg-cream"}`}>
                        {p.key}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => addEventToDay(modalDay)} disabled={!newTitle.trim()}
                    className="w-full bg-sage text-cream rounded-xl py-2 text-sm font-semibold hover:bg-sage/80 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                    <Plus size={14} /> Toevoegen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pt-14 md:pt-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="text-sage" size={28} />
          <h1 className="font-display text-3xl text-brown">Onze Kalender</h1>
        </div>
        <button
          onClick={() => router.push("/kalender")}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-warm border border-warm hover:bg-cream text-brown-light hover:text-terracotta transition-colors text-sm font-semibold"
        >
          <Calendar size={14} /> Bekijken
        </button>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-2 mb-5">
        {PERSONS.map((p) => (
          <div key={p.key} className="flex items-center gap-1.5 bg-cream rounded-full px-3 py-1 border border-warm">
            <span className={`w-2.5 h-2.5 rounded-full ${p.dot}`} />
            <span className="text-xs text-brown font-semibold">{p.key}</span>
          </div>
        ))}
        <div className="w-px bg-warm mx-1" />
        {CATEGORIES.filter(c => c.key !== "werk-vroeg" && c.key !== "werk-laat").slice(1).map((c) => (
          <div key={c.key} className="flex items-center gap-1 bg-cream rounded-full px-3 py-1 border border-warm">
            <span className="text-xs">{c.icon}</span>
            <span className="text-xs text-brown-light">{c.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 bg-cream rounded-full px-3 py-1 border border-warm">
          <span className="text-xs">🌙</span><span className="text-xs text-brown-light">Vroeg</span>
        </div>
        <div className="flex items-center gap-1 bg-cream rounded-full px-3 py-1 border border-warm">
          <span className="text-xs">☀️</span><span className="text-xs text-brown-light">Laat</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Kalender */}
        <div className="md:col-span-3 bg-warm rounded-3xl p-5 border border-warm">
          {/* Maand navigatie */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-cream transition-colors">
              <ChevronLeft size={18} className="text-brown" />
            </button>
            <h2 className="font-display text-xl text-brown capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: nl })}
            </h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-cream transition-colors">
              <ChevronRight size={18} className="text-brown" />
            </button>
          </div>

          {/* Multi-dag toggle */}
          <div className="flex justify-end mb-3">
            <button
              onClick={() => { setMultiMode(!multiMode); setSelectedDates([]); }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                multiMode ? "bg-terracotta text-cream" : "bg-cream text-brown-light hover:bg-warm border border-warm"
              }`}
            >
              <CalendarDays size={12} />
              {multiMode ? "Selectie aan" : "Meerdere dagen"}
            </button>
          </div>

          {/* Weekdagen */}
          <div className="grid grid-cols-7 mb-1">
            {["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-brown-light py-1">{d}</div>
            ))}
          </div>

          {/* Dagen */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: startDay }).map((_, i) => <div key={`e-${i}`} />)}
            {days.map((day) => {
              const dayEvents = eventsOnDay(day);
              const selected = isDaySelected(day);
              const today = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-[56px] rounded-xl text-sm flex flex-col items-start p-1 transition-all duration-100
                    ${selected ? "bg-terracotta text-cream shadow-sm" :
                      today ? "bg-rose-light text-brown" :
                      "hover:bg-cream text-brown"}
                    ${!isSameMonth(day, currentMonth) ? "opacity-30" : ""}
                  `}
                >
                  <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full mb-0.5 ${today && !selected ? "bg-rose text-cream" : ""}`}>
                    {format(day, "d")}
                  </span>
                  <div className="flex flex-col gap-px w-full">
                    {dayEvents.slice(0, 2).map((ev) => {
                      return (
                        <span key={ev.id} className={`text-[9px] leading-tight rounded px-1 truncate w-full font-medium ${selected ? "bg-white/20 text-cream" : `${getEventChipColor(ev)} opacity-90`}`}>
                          {ev.title}
                        </span>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <span className={`text-[9px] leading-tight px-1 ${selected ? "text-cream/70" : "text-brown-light"}`}>
                        +{dayEvents.length - 2}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selectie info */}
          {selectedDates.length > 1 && (
            <div className="mt-3 flex items-center justify-between bg-cream rounded-2xl px-3 py-2">
              <p className="text-xs text-brown">{selectedDates.length} dagen geselecteerd</p>
              <button onClick={clearSelection} className="text-xs text-brown-light hover:text-rose transition-colors">Wissen</button>
            </div>
          )}
        </div>

        {/* Zijpaneel */}
        <div className="md:col-span-2 flex flex-col gap-4">
          {focusDate ? (
            <>
              {/* Afspraken van geselecteerde dag */}
              <div className="bg-cream rounded-3xl p-5 border border-warm">
                <p className="font-handwriting text-xl text-brown mb-3 capitalize">
                  {selectedLabel()}
                </p>
                {/* Toon events alleen als 1 dag geselecteerd */}
                {selectedDates.length === 1 && (
                  loading ? (
                    <p className="text-sm text-brown-light">Laden...</p>
                  ) : eventsOnFocus.length === 0 ? (
                    <p className="text-sm text-brown-light italic">Nog geen afspraken 🌿</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {eventsOnFocus.map((ev) => {
                        const cat = getCategoryMeta(ev.category);
                        return (
                          <li key={ev.id} className="flex items-center gap-2 group bg-warm rounded-2xl px-3 py-2">
                            <span className="text-base shrink-0">{cat.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-brown font-medium leading-tight truncate">{ev.title}</p>
                              {ev.time && (
                                <p className="text-xs text-brown-light flex items-center gap-1">
                                  <Clock size={10} /> {ev.time}
                                </p>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${getEventChipColor(ev)}`}>{ev.person}</span>
                            <button onClick={() => deleteEvent(ev.id)} className="text-brown-light hover:text-rose transition-colors shrink-0">
                              <Trash2 size={13} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )
                )}
                {selectedDates.length > 1 && (
                  <p className="text-sm text-brown-light italic">De afspraak wordt toegevoegd aan alle {selectedDates.length} geselecteerde dagen.</p>
                )}
              </div>

              {/* Formulier */}
              <div className="bg-sage-light/30 rounded-3xl p-5 border border-warm flex flex-col gap-3">
                <p className="font-semibold text-sm text-brown">Afspraak toevoegen</p>

                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addEvent()}
                  placeholder="Naam van de afspraak..."
                  className="bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-sage"
                />

                {/* Tijdstip */}
                <div>
                  <p className="text-xs text-brown-light mb-1.5 flex items-center gap-1"><Clock size={11} /> Tijdstip (optioneel)</p>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-sage w-full"
                  />
                </div>

                {/* Categorie */}
                <div>
                  <p className="text-xs text-brown-light mb-1.5">Categorie</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.filter(c => c.key !== "werk-vroeg" && c.key !== "werk-laat").map((cat) => (
                      <div key={cat.key} className="relative group/werk">
                        <button
                          onClick={() => setNewCategory(cat.key)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-all border ${
                            newCategory === cat.key || (cat.key === "werk" && (newCategory === "werk-vroeg" || newCategory === "werk-laat"))
                              ? `${cat.color} border-current`
                              : "bg-cream text-brown-light border-warm hover:bg-warm"
                          }`}
                        >
                          <span>{cat.icon}</span> {cat.label}
                        </button>
                        {cat.key === "werk" && (
                          <div className="absolute left-0 top-full mt-1 hidden group-hover/werk:flex flex-col bg-cream border border-warm rounded-2xl shadow-lg overflow-hidden z-10 min-w-[90px]">
                            {WERK_SUBTYPES.map(sub => (
                              <button
                                key={sub.key}
                                onClick={() => setNewCategory(sub.key)}
                                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-warm transition-colors ${newCategory === sub.key ? "bg-blue-100 text-blue-600" : "text-brown"}`}
                              >
                                <span>{sub.icon}</span> {sub.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Persoon */}
                <div>
                  <p className="text-xs text-brown-light mb-1.5">Voor wie</p>
                  <div className="flex gap-2">
                    {PERSONS.map((p) => (
                      <button
                        key={p.key}
                        onClick={() => setNewPerson(p.key)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          newPerson === p.key ? p.color + " shadow-sm" : "bg-cream text-brown-light hover:bg-warm"
                        }`}
                      >
                        {p.key}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={addEvent}
                  className="w-full bg-sage text-cream rounded-xl py-2 text-sm font-semibold hover:bg-sage/80 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  {selectedDates.length > 1 ? `Toevoegen aan ${selectedDates.length} dagen` : "Toevoegen"}
                </button>
              </div>
            </>
          ) : (
            <div className="bg-cream rounded-3xl p-5 border border-warm flex flex-col items-center justify-center gap-2 h-40">
              <Calendar size={28} className="text-warm" />
              <p className="text-sm text-brown-light text-center">
                {multiMode ? "Klik op een startdatum om een reeks te selecteren" : "Klik op een dag om afspraken te zien of toe te voegen"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

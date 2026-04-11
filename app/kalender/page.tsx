"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Trash2, ChevronLeft, ChevronRight, CalendarDays, Clock } from "lucide-react";
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
  { key: "algemeen",   label: "Algemeen",   icon: "📅", color: "bg-warm text-brown-light" },
  { key: "werk",       label: "Werk",       icon: "💼", color: "bg-blue-100 text-blue-600" },
  { key: "thuis",      label: "Thuis",      icon: "🏠", color: "bg-terracotta-light/30 text-terracotta" },
  { key: "samen",      label: "Samen",      icon: "💕", color: "bg-rose-light/50 text-rose" },
  { key: "dokter",     label: "Dokter",     icon: "🏥", color: "bg-green-100 text-green-600" },
  { key: "sport",      label: "Sport",      icon: "🏃", color: "bg-sage-light text-sage" },
  { key: "verjaardag", label: "Verjaardag", icon: "🎂", color: "bg-yellow-100 text-yellow-600" },
  { key: "uitje",      label: "Uitje",      icon: "✈️", color: "bg-purple-100 text-purple-500" },
];

const PERSONS: { key: Person; color: string; dot: string }[] = [
  { key: "Emma",  color: "bg-rose text-cream",      dot: "bg-rose" },
  { key: "Roel",  color: "bg-sage text-cream",       dot: "bg-sage" },
  { key: "Samen", color: "bg-terracotta text-cream", dot: "bg-terracotta" },
];

function getCategoryMeta(key: string) {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[0];
}
function getPersonMeta(key: Person) {
  return PERSONS.find((p) => p.key === key) ?? PERSONS[2];
}

export default function KalenderPage() {
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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="text-sage" size={28} />
        <h1 className="font-display text-3xl text-brown">Onze Kalender</h1>
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
        {CATEGORIES.slice(1).map((c) => (
          <div key={c.key} className="flex items-center gap-1 bg-cream rounded-full px-3 py-1 border border-warm">
            <span className="text-xs">{c.icon}</span>
            <span className="text-xs text-brown-light">{c.label}</span>
          </div>
        ))}
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
                  className={`aspect-square rounded-xl text-sm flex flex-col items-center justify-center transition-all duration-100 relative
                    ${selected ? "bg-terracotta text-cream shadow-sm font-bold" :
                      today ? "bg-rose-light text-brown font-bold" :
                      "hover:bg-cream text-brown"}
                    ${!isSameMonth(day, currentMonth) ? "opacity-30" : ""}
                  `}
                >
                  {format(day, "d")}
                  {dayEvents.length > 0 && (
                    <div className="absolute bottom-0.5 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((ev, i) => (
                        <span key={i} className={`w-1 h-1 rounded-full ${selected ? "bg-cream" : getPersonMeta(ev.person).dot}`} />
                      ))}
                    </div>
                  )}
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
                        const person = getPersonMeta(ev.person);
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
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${person.color}`}>{ev.person}</span>
                            <button onClick={() => deleteEvent(ev.id)} className="opacity-0 group-hover:opacity-100 text-rose transition-opacity shrink-0">
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
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => setNewCategory(cat.key)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-all border ${
                          newCategory === cat.key ? `${cat.color} border-current` : "bg-cream text-brown-light border-warm hover:bg-warm"
                        }`}
                      >
                        <span>{cat.icon}</span> {cat.label}
                      </button>
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

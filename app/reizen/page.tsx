"use client";

import { useState, useEffect } from "react";
import { Plane, Plus, Trash2, ChevronRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

type Trip = {
  id: string;
  title: string;
  destination: string;
  flag: string;
  dateFrom: string;
  dateTo: string;
  description: string;
  coverColor: string;
  blocks: unknown[];
  created_at: string;
};

const COVER_COLORS = [
  { label: "Terracotta", value: "#c2714f" },
  { label: "Salie", value: "#7a9e7e" },
  { label: "Roos", value: "#d4848a" },
  { label: "Blauw", value: "#6a9bbf" },
  { label: "Lavendel", value: "#9b7ab8" },
  { label: "Donker", value: "#4a3f35" },
];

export default function ReizenPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "", destination: "", flag: "🌍",
    dateFrom: "", dateTo: "", description: "", coverColor: "#c2714f",
  });

  const [refreshing, setRefreshing] = useState(false);

  async function loadTrips() {
    setRefreshing(true);
    await fetch("/api/trips").then((r) => r.json()).then((d) => setTrips(Array.isArray(d) ? d : [])).finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { loadTrips(); }, []);

  async function createTrip() {
    if (!form.title.trim() || !form.destination.trim()) return;
    const res = await fetch("/api/trips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const created = await res.json();
    setTrips((prev) => [created, ...prev]);
    setShowForm(false);
    setForm({ title: "", destination: "", flag: "🌍", dateFrom: "", dateTo: "", description: "", coverColor: "#c2714f" });
  }

  async function deleteTrip(id: string, e: React.MouseEvent) {
    e.preventDefault();
    await fetch(`/api/trips/${id}`, { method: "DELETE" });
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto pt-14 md:pt-0">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Plane className="text-terracotta" size={28} />
          <h1 className="font-display text-3xl text-brown">Onze Reizen</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTrips}
            disabled={refreshing}
            className="p-2 rounded-xl hover:bg-warm transition-colors text-brown-light disabled:opacity-50"
            title="Vernieuwen"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-terracotta text-cream px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-terracotta/80 transition-colors">
            <Plus size={16} /> Nieuwe reis
          </button>
        </div>
      </div>

      {/* Nieuwe reis formulier */}
      {showForm && (
        <div className="bg-warm rounded-3xl p-6 border border-warm mb-8">
          <p className="font-semibold text-brown mb-4 text-sm">Nieuwe reis toevoegen</p>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input value={form.flag} onChange={(e) => setForm({ ...form, flag: e.target.value })} className="w-12 bg-cream rounded-xl border border-warm text-center py-2 focus:outline-none focus:border-terracotta" maxLength={2} />
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titel (bv. Romantisch Parijs)" className="flex-1 bg-cream rounded-xl border border-warm px-4 py-2 text-sm text-brown focus:outline-none focus:border-terracotta" />
            </div>
            <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Bestemming (bv. Parijs, Frankrijk)" className="bg-cream rounded-xl border border-warm px-4 py-2 text-sm text-brown focus:outline-none focus:border-terracotta" />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-brown-light mb-1 block">Van</label>
                <input type="date" value={form.dateFrom} onChange={(e) => setForm({ ...form, dateFrom: e.target.value })} className="w-full bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-terracotta" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-brown-light mb-1 block">Tot</label>
                <input type="date" value={form.dateTo} onChange={(e) => setForm({ ...form, dateTo: e.target.value })} className="w-full bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-terracotta" />
              </div>
            </div>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Korte beschrijving..." rows={2} className="bg-cream rounded-xl border border-warm px-4 py-2 text-sm text-brown focus:outline-none focus:border-terracotta resize-none" />
            <div>
              <p className="text-xs text-brown-light mb-2">Omslagkleur</p>
              <div className="flex gap-2">
                {COVER_COLORS.map((c) => (
                  <button key={c.value} onClick={() => setForm({ ...form, coverColor: c.value })} style={{ backgroundColor: c.value }} className={`w-7 h-7 rounded-full transition-all ${form.coverColor === c.value ? "ring-2 ring-offset-2 ring-brown" : ""}`} title={c.label} />
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-1">
              <button onClick={createTrip} className="flex-1 bg-terracotta text-cream rounded-xl py-2 text-sm font-semibold hover:bg-terracotta/80">Aanmaken</button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-cream text-brown-light rounded-xl py-2 text-sm hover:bg-warm">Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {/* Reizen lijst */}
      {loading ? (
        <p className="text-brown-light text-sm text-center mt-10">Laden...</p>
      ) : trips.length === 0 ? (
        <div className="text-center mt-20">
          <p className="font-handwriting text-2xl text-brown-light">Nog geen reizen 🗺️</p>
          <p className="text-sm text-brown-light mt-1">Voeg jullie eerste avontuur toe!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {trips.map((trip) => (
            <Link key={trip.id} href={`/reizen/${trip.id}`} className="group relative bg-cream rounded-3xl border border-warm overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex">
              {/* Gekleurde zijbalk */}
              <div className="w-3 shrink-0" style={{ backgroundColor: trip.coverColor }} />
              <div className="flex-1 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{trip.flag}</span>
                    <div>
                      <h2 className="font-display text-xl text-brown">{trip.title}</h2>
                      <p className="text-sm text-brown-light">{trip.destination}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => deleteTrip(trip.id, e)} className="opacity-0 group-hover:opacity-100 text-rose transition-opacity p-1">
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={18} className="text-brown-light group-hover:text-terracotta transition-colors" />
                  </div>
                </div>
                {(trip.dateFrom || trip.dateTo) && (
                  <p className="text-xs text-brown-light mb-2">
                    {trip.dateFrom && format(new Date(trip.dateFrom), "d MMM yyyy", { locale: nl })}
                    {trip.dateFrom && trip.dateTo && " – "}
                    {trip.dateTo && format(new Date(trip.dateTo), "d MMM yyyy", { locale: nl })}
                  </p>
                )}
                {trip.description && <p className="text-sm text-brown line-clamp-2">{trip.description}</p>}
                <p className="text-xs text-brown-light mt-2">{trip.blocks.length} {trip.blocks.length === 1 ? "onderdeel" : "onderdelen"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { UtensilsCrossed, Plus, Trash2, ChevronLeft, ChevronRight, Camera, X } from "lucide-react";
import NextImage from "next/image";
import {
  getISOWeek, getISOWeekYear, startOfISOWeek, addWeeks, addDays, format,
} from "date-fns";
import { nl } from "date-fns/locale";

type Meal = {
  id: string;
  day: string;
  slot: "ontbijt" | "lunch" | "avondeten";
  name: string;
  emoji: string;
  week: string;
  photo_url: string | null;
};

const DAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
const SLOTS = ["ontbijt", "lunch", "avondeten"] as const;
const SLOT_COLORS = {
  ontbijt: "bg-rose-light/40 text-rose",
  lunch: "bg-sage-light/40 text-sage",
  avondeten: "bg-terracotta-light/30 text-terracotta",
};

function toWeekKey(monday: Date): string {
  return `${getISOWeekYear(monday)}-W${String(getISOWeek(monday)).padStart(2, "0")}`;
}

function weekLabel(monday: Date): string {
  const sunday = addDays(monday, 6);
  const weekNum = getISOWeek(monday);
  return `Week ${weekNum} • ${format(monday, "d MMM", { locale: nl })} – ${format(sunday, "d MMM yyyy", { locale: nl })}`;
}

type Tab = "weekmenu" | "fotos";

export default function MenuPage() {
  const [tab, setTab] = useState<Tab>("weekmenu");
  const [weekStart, setWeekStart] = useState<Date>(() => startOfISOWeek(new Date()));
  const [meals, setMeals] = useState<Meal[]>([]);
  const [adding, setAdding] = useState<{ day: string; slot: Meal["slot"] } | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("🍽️");
  const [loading, setLoading] = useState(true);
  const [photoUploading, setPhotoUploading] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoTargetMeal = useRef<Meal | null>(null);

  const weekKey = toWeekKey(weekStart);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/meals?week=${weekKey}`)
      .then((r) => r.json())
      .then((data) => setMeals(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [weekKey]);

  function getMeal(day: string, slot: Meal["slot"]) {
    return meals.find((m) => m.day === day && m.slot === slot);
  }

  async function addMeal() {
    if (!newName.trim() || !adding) return;
    const res = await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day: adding.day, slot: adding.slot, name: newName, emoji: newEmoji, week: weekKey }),
    });
    const created = await res.json();
    setMeals((prev) => [...prev.filter((m) => !(m.day === adding.day && m.slot === adding.slot)), created]);
    setAdding(null);
    setNewName("");
    setNewEmoji("🍽️");
  }

  async function deleteMeal(id: string) {
    await fetch(`/api/meals/${id}`, { method: "DELETE" });
    setMeals((prev) => prev.filter((m) => m.id !== id));
  }

  function openPhotoUpload(meal: Meal) {
    photoTargetMeal.current = meal;
    photoInputRef.current?.click();
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const meal = photoTargetMeal.current;
    if (!file || !meal) return;

    setPhotoUploading(meal.id);
    const ext = file.name.split(".").pop() ?? "jpg";

    // 1. Presign
    const presignRes = await fetch("/api/photos/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ext }),
    });
    const { signedUrl, filename, error: presignError } = await presignRes.json();
    if (presignError || !signedUrl) {
      setPhotoUploading(null);
      return;
    }

    // 2. Upload to Supabase Storage
    await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    // 3. Save URL via PATCH
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/uploads/${filename}`;
    const patchRes = await fetch(`/api/meals/${meal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_url: publicUrl }),
    });
    const updated = await patchRes.json();
    setMeals((prev) => prev.map((m) => m.id === updated.id ? updated : m));

    setPhotoUploading(null);
    photoTargetMeal.current = null;
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  async function removePhoto(meal: Meal) {
    const patchRes = await fetch(`/api/meals/${meal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_url: null }),
    });
    const updated = await patchRes.json();
    setMeals((prev) => prev.map((m) => m.id === updated.id ? updated : m));
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <UtensilsCrossed className="text-brown-light" size={28} />
        <h1 className="font-display text-3xl text-brown">Weekmenu</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("weekmenu")}
          className={`px-5 py-2 rounded-2xl font-body text-sm transition-colors ${tab === "weekmenu" ? "bg-brown text-cream" : "bg-warm text-brown-light hover:text-brown"}`}
        >
          Weekmenu
        </button>
        <button
          onClick={() => setTab("fotos")}
          className={`px-5 py-2 rounded-2xl font-body text-sm transition-colors flex items-center gap-2 ${tab === "fotos" ? "bg-brown text-cream" : "bg-warm text-brown-light hover:text-brown"}`}
        >
          <Camera size={14} />
          Foto&apos;s toevoegen
        </button>
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-center gap-4 mb-8 bg-warm rounded-3xl px-6 py-4">
        <button
          onClick={() => setWeekStart((d) => addWeeks(d, -1))}
          className="p-2 rounded-2xl hover:bg-cream transition-colors text-brown-light hover:text-brown"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="font-display text-brown text-base">{weekLabel(weekStart)}</p>
        </div>
        <button
          onClick={() => setWeekStart((d) => addWeeks(d, 1))}
          className="p-2 rounded-2xl hover:bg-cream transition-colors text-brown-light hover:text-brown"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Hidden file input for photo upload */}
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

      {loading ? (
        <p className="text-brown-light text-center mt-10">Laden...</p>
      ) : tab === "weekmenu" ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-3 pr-4 font-display text-brown text-sm w-28" />
                {DAYS.map((day, i) => {
                  const date = addDays(weekStart, i);
                  return (
                    <th key={day} className="text-center py-3 px-2 font-display text-brown text-sm">
                      <div>{day.slice(0, 2)}</div>
                      <div className="text-xs font-body text-brown-light font-normal">{format(date, "d MMM", { locale: nl })}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((slot) => (
                <tr key={slot}>
                  <td className="py-2 pr-4">
                    <span className={`text-xs font-semibold capitalize px-2 py-1 rounded-full ${SLOT_COLORS[slot]}`}>
                      {slot}
                    </span>
                  </td>
                  {DAYS.map((day) => {
                    const meal = getMeal(day, slot);
                    return (
                      <td key={day} className="py-2 px-2">
                        {meal ? (
                          <div className="relative rounded-2xl overflow-hidden min-h-[5rem] group">
                            {meal.photo_url ? (
                              <NextImage
                                src={meal.photo_url}
                                alt={meal.name}
                                fill
                                className="object-cover"
                                sizes="120px"
                              />
                            ) : null}
                            <div className={`relative z-10 p-2.5 flex flex-col items-center justify-center min-h-[5rem] ${meal.photo_url ? "bg-brown/50" : "bg-warm"}`}>
                              <span className="text-lg">{meal.emoji}</span>
                              <p className={`text-xs leading-tight mt-0.5 text-center ${meal.photo_url ? "text-cream font-semibold" : "text-brown"}`}>
                                {meal.name}
                              </p>
                            </div>
                            <div className="absolute inset-0 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col">
                              <div className="flex justify-between p-1">
                                <button
                                  onClick={() => deleteMeal(meal.id)}
                                  className="bg-rose/90 text-cream rounded-lg p-1 hover:bg-rose"
                                  title="Verwijderen"
                                >
                                  <Trash2 size={10} />
                                </button>
                                <div className="flex gap-1">
                                  {meal.photo_url && (
                                    <button
                                      onClick={() => removePhoto(meal)}
                                      className="bg-brown/80 text-cream rounded-lg p-1 hover:bg-brown"
                                      title="Foto verwijderen"
                                    >
                                      <X size={10} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => openPhotoUpload(meal)}
                                    disabled={photoUploading === meal.id}
                                    className="bg-sage/90 text-cream rounded-lg p-1 hover:bg-sage"
                                    title="Foto toevoegen"
                                  >
                                    {photoUploading === meal.id ? (
                                      <span className="text-[8px]">...</span>
                                    ) : (
                                      <Camera size={10} />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : adding?.day === day && adding?.slot === slot ? (
                          <div className="bg-cream rounded-2xl p-2 border border-sage flex flex-col gap-1">
                            <div className="flex gap-1">
                              <input
                                value={newEmoji}
                                onChange={(e) => setNewEmoji(e.target.value)}
                                className="w-8 text-center text-xs bg-transparent border-b border-warm focus:outline-none"
                                maxLength={2}
                                autoFocus
                              />
                            </div>
                            <input
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") addMeal(); if (e.key === "Escape") setAdding(null); }}
                              placeholder="gerecht"
                              className="text-xs bg-transparent border-b border-warm focus:outline-none text-brown w-full"
                            />
                            <div className="flex gap-1 mt-1">
                              <button onClick={addMeal} className="flex-1 text-xs bg-sage text-cream rounded-lg py-0.5 hover:bg-sage/80">Ok</button>
                              <button onClick={() => setAdding(null)} className="flex-1 text-xs bg-warm rounded-lg py-0.5 text-brown-light hover:bg-warm/80">✕</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAdding({ day, slot })}
                            className="w-full h-20 rounded-2xl border-2 border-dashed border-warm hover:border-sage hover:bg-sage-light/20 transition-all flex items-center justify-center group"
                          >
                            <Plus size={14} className="text-warm group-hover:text-sage transition-colors" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Foto's tab */
        <div>
          {meals.length === 0 ? (
            <p className="text-brown-light text-center mt-10">Geen gerechten deze week. Voeg eerst gerechten toe via het Weekmenu.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {meals.map((meal) => (
                <div key={meal.id} className="bg-warm rounded-3xl overflow-hidden flex flex-col">
                  {/* Photo area */}
                  <div className="relative h-40 bg-cream flex items-center justify-center">
                    {meal.photo_url ? (
                      <>
                        <NextImage
                          src={meal.photo_url}
                          alt={meal.name}
                          fill
                          className="object-cover"
                          sizes="200px"
                        />
                        <button
                          onClick={() => removePhoto(meal)}
                          className="absolute top-2 right-2 z-10 bg-brown/80 text-cream rounded-full p-1 hover:bg-brown"
                          title="Foto verwijderen"
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => openPhotoUpload(meal)}
                        disabled={photoUploading === meal.id}
                        className="flex flex-col items-center gap-2 text-brown-light hover:text-brown transition-colors"
                      >
                        {photoUploading === meal.id ? (
                          <span className="text-sm">Uploaden...</span>
                        ) : (
                          <>
                            <Camera size={28} />
                            <span className="text-xs">Foto toevoegen</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  {/* Meal info */}
                  <div className="p-3 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{meal.emoji}</span>
                      <p className="text-sm font-semibold text-brown truncate">{meal.name}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs capitalize px-2 py-0.5 rounded-full ${SLOT_COLORS[meal.slot]}`}>{meal.slot}</span>
                      <span className="text-xs text-brown-light">{meal.day.slice(0, 2)}</span>
                    </div>
                    {meal.photo_url && (
                      <button
                        onClick={() => openPhotoUpload(meal)}
                        disabled={photoUploading === meal.id}
                        className="mt-1 text-xs text-brown-light hover:text-brown flex items-center gap-1 transition-colors"
                      >
                        <Camera size={11} />
                        {photoUploading === meal.id ? "Uploaden..." : "Foto vervangen"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

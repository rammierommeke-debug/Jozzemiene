"use client";

import { useState, useEffect, useRef } from "react";
import { Mail, Plus, Trash2, X, RotateCcw, ImagePlus, Loader } from "lucide-react";
import NextImage from "next/image";

type Postcard = {
  id: string;
  background: string;
  frontPhoto: string | null;
  frontEmoji: string;
  frontText: string;
  stickers: string[];
  message: string;
  from: string;
  to: string;
  stamp: string;
  stampColor: string;
  created_at: string;
};

const BACKGROUNDS = [
  { label: "Zonsondergang", value: "linear-gradient(135deg, #f5a367, #f07b7b)" },
  { label: "Salie", value: "linear-gradient(135deg, #a8c4aa, #7a9e7e)" },
  { label: "Lavendel", value: "linear-gradient(135deg, #c4a8d4, #9b7ab8)" },
  { label: "Oceaan", value: "linear-gradient(135deg, #7ab8d4, #4a8fb8)" },
  { label: "Roos", value: "linear-gradient(135deg, #e8b4b8, #d4848a)" },
  { label: "Creme", value: "linear-gradient(135deg, #fdf6ec, #f5e6d0)" },
  { label: "Nacht", value: "linear-gradient(135deg, #3d3560, #6b4c8a)" },
  { label: "Bos", value: "linear-gradient(135deg, #4a7c59, #2d5a3d)" },
];

const FRONT_EMOJIS = ["🌸", "💕", "🌹", "🦋", "🌙", "⭐", "🌈", "🏔️", "🌊", "🌿", "🎀", "✨", "🌺", "🍃", "💫", "🐚"];
const STAMPS = [
  { emoji: "💌", color: "#c2714f" },
  { emoji: "🌸", color: "#d4848a" },
  { emoji: "🦋", color: "#9b7ab8" },
  { emoji: "⭐", color: "#d4aa4f" },
  { emoji: "🌿", color: "#7a9e7e" },
  { emoji: "❤️", color: "#c2714f" },
  { emoji: "🌊", color: "#4a8fb8" },
  { emoji: "✈️", color: "#6b4c3b" },
];
const STICKER_OPTIONS = ["🌸", "💕", "⭐", "🦋", "🌙", "🎀", "🌿", "✨", "🍃", "💫", "🌺", "🐚", "🌈", "🎵", "🕊️", "🫶"];

type Side = "front" | "back";

const defaultCard = {
  background: BACKGROUNDS[0].value,
  frontPhoto: null as string | null,
  frontEmoji: "🌸",
  frontText: "",
  stickers: [] as string[],
  message: "",
  from: "",
  to: "",
  stamp: "💌",
  stampColor: "#c2714f",
};

export default function BerichtjesPage() {
  const [postcards, setPostcards] = useState<Postcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [side, setSide] = useState<Side>("front");
  const [card, setCard] = useState({ ...defaultCard });
  const [reading, setReading] = useState<{ card: Postcard; side: Side } | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/postcards").then((r) => r.json()).then((d) => setPostcards(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/postcards/upload", { method: "POST", body: form });
    const { url } = await res.json();
    setCard((prev) => ({ ...prev, frontPhoto: url }));
    setUploadingPhoto(false);
    if (photoRef.current) photoRef.current.value = "";
  }

  async function saveCard() {
    const res = await fetch("/api/postcards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(card) });
    const created = await res.json();
    setPostcards((prev) => [created, ...prev]);
    setCreating(false);
    setCard({ ...defaultCard });
    setSide("front");
  }

  async function deleteCard(id: string) {
    await fetch(`/api/postcards/${id}`, { method: "DELETE" });
    setPostcards((prev) => prev.filter((c) => c.id !== id));
    if (reading?.card.id === id) setReading(null);
  }

  function toggleSticker(emoji: string) {
    setCard((prev) => ({
      ...prev,
      stickers: prev.stickers.includes(emoji) ? prev.stickers.filter((s) => s !== emoji) : [...prev.stickers, emoji],
    }));
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Mail className="text-rose" size={28} />
          <h1 className="font-display text-3xl text-brown">Lieve Berichtjes</h1>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 bg-rose text-cream px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-rose/80 transition-colors">
            <Plus size={16} /> Nieuwe kaart
          </button>
        )}
      </div>

      {/* Maker */}
      {creating && (
        <div className="bg-warm rounded-3xl border border-warm p-6 mb-10">
          <div className="flex items-center justify-between mb-5">
            <p className="font-display text-xl text-brown">Postkaart maken</p>
            <button onClick={() => { setCreating(false); setCard({ ...defaultCard }); setSide("front"); }} className="text-brown-light hover:text-rose transition-colors"><X size={18} /></button>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Preview */}
            <div className="flex flex-col items-center gap-3">
              <PostcardPreview card={card} side={side} />
              <button onClick={() => setSide(side === "front" ? "back" : "front")} className="flex items-center gap-2 text-xs text-brown-light hover:text-terracotta transition-colors font-semibold">
                <RotateCcw size={13} /> Omdraaien ({side === "front" ? "voorkant" : "achterkant"})
              </button>
            </div>

            {/* Controls */}
            <div className="flex-1 flex flex-col gap-5 overflow-y-auto max-h-[420px] pr-1">
              {side === "front" ? (
                <>
                  <div>
                    <p className="text-xs font-semibold text-brown mb-2">Foto (optioneel)</p>
                    <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => photoRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="flex items-center gap-2 bg-cream border border-warm rounded-xl px-3 py-2 text-xs font-semibold text-brown hover:bg-warm transition-colors disabled:opacity-50"
                      >
                        {uploadingPhoto ? <Loader size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                        {uploadingPhoto ? "Uploaden..." : "Foto uploaden"}
                      </button>
                      {card.frontPhoto && (
                        <button onClick={() => setCard({ ...card, frontPhoto: null })} className="text-xs text-rose hover:text-rose/70 flex items-center gap-1">
                          <X size={12} /> Verwijderen
                        </button>
                      )}
                    </div>
                    {card.frontPhoto && (
                      <div className="mt-2 w-16 h-10 rounded-lg overflow-hidden">
                        <NextImage src={card.frontPhoto} alt="" width={64} height={40} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brown mb-2">Achtergrondkleur</p>
                    <div className="flex flex-wrap gap-2">
                      {BACKGROUNDS.map((bg) => (
                        <button key={bg.value} onClick={() => setCard({ ...card, background: bg.value })} style={{ background: bg.value }} className={`w-8 h-8 rounded-full transition-all ${card.background === bg.value ? "ring-2 ring-offset-2 ring-brown scale-110" : ""}`} title={bg.label} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brown mb-2">Hoofdelement</p>
                    <div className="flex flex-wrap gap-2">
                      {FRONT_EMOJIS.map((e) => (
                        <button key={e} onClick={() => setCard({ ...card, frontEmoji: e })} className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${card.frontEmoji === e ? "bg-terracotta/20 ring-2 ring-terracotta" : "bg-cream hover:bg-warm"}`}>{e}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brown mb-2">Stickers</p>
                    <div className="flex flex-wrap gap-2">
                      {STICKER_OPTIONS.map((e) => (
                        <button key={e} onClick={() => toggleSticker(e)} className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${card.stickers.includes(e) ? "bg-rose-light ring-2 ring-rose" : "bg-cream hover:bg-warm"}`}>{e}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brown mb-2">Tekst op voorkant (optioneel)</p>
                    <input value={card.frontText} onChange={(e) => setCard({ ...card, frontText: e.target.value })} placeholder="bv. Met liefde voor jou 💕" className="w-full bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-rose" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-semibold text-brown mb-2">Postzegel</p>
                    <div className="flex flex-wrap gap-2">
                      {STAMPS.map((s) => (
                        <button key={s.emoji} onClick={() => setCard({ ...card, stamp: s.emoji, stampColor: s.color })} style={{ borderColor: s.color }} className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border-2 transition-all ${card.stamp === s.emoji ? "scale-110 shadow-md" : "bg-cream hover:bg-warm"}`}>{s.emoji}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brown mb-2">Bericht</p>
                    <textarea value={card.message} onChange={(e) => setCard({ ...card, message: e.target.value })} placeholder="Schrijf hier je lieve berichtje..." rows={4} className="w-full bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-rose resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-brown mb-1">Van</p>
                      <input value={card.from} onChange={(e) => setCard({ ...card, from: e.target.value })} placeholder="Naam" className="w-full bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-rose" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-brown mb-1">Voor</p>
                      <input value={card.to} onChange={(e) => setCard({ ...card, to: e.target.value })} placeholder="Naam" className="w-full bg-cream rounded-xl border border-warm px-3 py-2 text-sm text-brown focus:outline-none focus:border-rose" />
                    </div>
                  </div>
                </>
              )}

              <button onClick={saveCard} className="w-full bg-rose text-cream rounded-xl py-2.5 text-sm font-semibold hover:bg-rose/80 transition-colors mt-auto">
                Kaart opslaan 💌
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Galerij */}
      {loading ? (
        <p className="text-brown-light text-sm text-center mt-10">Laden...</p>
      ) : postcards.length === 0 ? (
        <div className="text-center mt-20">
          <p className="font-handwriting text-2xl text-brown-light">Nog geen kaartjes 💌</p>
          <p className="text-sm text-brown-light mt-1">Maak jullie eerste postkaart!</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
          {postcards.map((pc) => (
            <div key={pc.id} className="break-inside-avoid group relative cursor-pointer" onClick={() => setReading({ card: pc, side: "front" })}>
              <PostcardPreview card={pc} side="front" small />
              <button onClick={(e) => { e.stopPropagation(); deleteCard(pc.id); }} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-brown/70 text-cream rounded-full p-1 hover:bg-brown transition-all">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lezen lightbox */}
      {reading && (
        <div className="fixed inset-0 bg-brown/70 z-50 flex items-center justify-center p-6" onClick={() => setReading(null)}>
          <div className="flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <PostcardPreview card={reading.card} side={reading.side} />
            <div className="flex gap-3">
              <button onClick={() => setReading({ ...reading, side: reading.side === "front" ? "back" : "front" })} className="flex items-center gap-2 bg-cream text-brown px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-warm transition-colors">
                <RotateCcw size={14} /> Omdraaien
              </button>
              <button onClick={() => setReading(null)} className="bg-brown/80 text-cream px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-brown transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostcardPreview({ card, side, small }: { card: typeof defaultCard | Postcard; side: Side; small?: boolean }) {
  const w = small ? "w-56" : "w-80";
  const h = small ? "h-36" : "h-52";

  if (side === "front") {
    const hasPhoto = "frontPhoto" in card && card.frontPhoto;
    return (
      <div
        className={`${w} ${h} rounded-2xl overflow-hidden shadow-md relative flex flex-col items-center justify-center`}
        style={hasPhoto ? {} : { background: card.background }}
      >
        {/* Foto als achtergrond */}
        {hasPhoto && (
          <>
            <NextImage src={(card as Postcard).frontPhoto!} alt="" fill className="object-cover" />
            {/* Kleur overlay */}
            <div className="absolute inset-0 opacity-30" style={{ background: card.background }} />
          </>
        )}
        {/* Decoratieve rand */}
        <div className="absolute inset-2 rounded-xl border-2 border-white/30" />
        {/* Stickers links boven */}
        <div className="absolute top-3 left-3 flex flex-col gap-0.5">
          {(card.stickers || []).slice(0, 3).map((s, i) => (
            <span key={i} className={small ? "text-base" : "text-xl"}>{s}</span>
          ))}
        </div>
        {/* Stickers rechts onder */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-0.5 items-end">
          {(card.stickers || []).slice(3, 6).map((s, i) => (
            <span key={i} className={small ? "text-base" : "text-xl"}>{s}</span>
          ))}
        </div>
        {/* Hoofdelement */}
        <span className={`relative z-10 ${small ? "text-4xl" : "text-6xl"}`} style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.15))" }}>{card.frontEmoji}</span>
        {/* Tekst */}
        {card.frontText && (
          <p className={`relative z-10 font-handwriting text-white text-center mt-2 px-4 ${small ? "text-sm" : "text-lg"}`} style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
            {card.frontText}
          </p>
        )}
      </div>
    );
  }

  // Achterkant
  return (
    <div className={`${w} ${h} rounded-2xl overflow-hidden shadow-md bg-[#fdf9f4] relative flex`} style={{ border: "1px solid #e8d8c4" }}>
      {/* Linkerkant: bericht */}
      <div className="flex-1 p-3 flex flex-col justify-between border-r border-dashed border-brown/20">
        <div>
          {card.to && <p className={`font-handwriting text-brown-light ${small ? "text-xs" : "text-sm"}`}>Lieve {card.to},</p>}
          <p className={`font-handwriting text-brown mt-1 leading-snug ${small ? "text-xs" : "text-sm"}`} style={{ whiteSpace: "pre-wrap" }}>
            {card.message || (small ? "" : "Schrijf hier je bericht...")}
          </p>
        </div>
        {card.from && <p className={`font-handwriting text-brown-light ${small ? "text-xs" : "text-sm"}`}>♡ {card.from}</p>}
      </div>
      {/* Rechterkant: postzegel + lijntjes */}
      <div className={`flex flex-col items-end justify-start ${small ? "p-2 w-16" : "p-3 w-24"}`}>
        {/* Postzegel */}
        <div
          className={`${small ? "w-10 h-10 text-xl" : "w-14 h-14 text-2xl"} rounded flex items-center justify-center border-2 mb-2`}
          style={{ borderColor: card.stampColor, background: `${card.stampColor}15` }}
        >
          {card.stamp}
        </div>
        {/* Adreslijntjes */}
        <div className="flex flex-col gap-1.5 w-full">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-px bg-brown/20 w-full" />
          ))}
        </div>
      </div>
      {/* Postmerk stempel */}
      <div className="absolute bottom-2 left-2 opacity-10">
        <div className={`${small ? "w-8 h-8 text-xs" : "w-12 h-12 text-sm"} rounded-full border-2 border-brown flex items-center justify-center font-handwriting text-brown`}>
          ♡
        </div>
      </div>
    </div>
  );
}

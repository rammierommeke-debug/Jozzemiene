"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload, Play, Pause, SkipBack, SkipForward, Volume2,
  BookOpen, ChevronLeft, ChevronRight, Loader, X, Settings2,
} from "lucide-react";

type Voice = { voice_id: string; name: string; labels?: Record<string, string> };

type Book = {
  title: string;
  chunks: string[];
};

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 2.0];

export default function LuisterenPage() {
  const [book, setBook] = useState<Book | null>(null);
  const [chunkIdx, setChunkIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceId, setVoiceId] = useState("EXAVITQu4vr4xnSDxMaL");
  const [speed, setSpeed] = useState(1.0);
  const [stability, setStability] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/reader/voices")
      .then(r => r.json())
      .then((v: Voice[]) => {
        if (Array.isArray(v) && v.length > 0) setVoices(v);
      })
      .catch(() => {});
  }, []);

  // Restore saved book from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("reader_book");
      if (saved) {
        const parsed = JSON.parse(saved);
        setBook(parsed.book);
        setChunkIdx(parsed.chunkIdx ?? 0);
      }
    } catch {}
  }, []);

  function saveProgress(b: Book, idx: number) {
    localStorage.setItem("reader_book", JSON.stringify({ book: b, chunkIdx: idx }));
  }

  async function handleFile(file: File) {
    setParsing(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/reader/parse", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? "Fout bij verwerken"); return; }
      setBook(data);
      setChunkIdx(0);
      saveProgress(data, 0);
    } catch {
      setError("Fout bij verwerken van bestand");
    } finally {
      setParsing(false);
    }
  }

  const speakChunk = useCallback(async (idx: number, b: Book) => {
    if (!b || idx >= b.chunks.length) { setPlaying(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reader/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: b.chunks[idx], voiceId, stability, speed }),
      });
      if (!res.ok) { const e = await res.json(); setError(e.error ?? "TTS fout"); setLoading(false); setPlaying(false); return; }

      const blob = await res.blob();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      if (!audioRef.current) audioRef.current = new Audio();
      const audio = audioRef.current;
      audio.src = url;
      audio.playbackRate = 1; // speed is handled server-side
      setLoading(false);
      await audio.play();
      setPlaying(true);

      audio.onended = () => {
        if (autoPlay && idx + 1 < b.chunks.length) {
          const next = idx + 1;
          setChunkIdx(next);
          saveProgress(b, next);
          speakChunk(next, b);
        } else {
          setPlaying(false);
          if (idx + 1 < b.chunks.length) {
            const next = idx + 1;
            setChunkIdx(next);
            saveProgress(b, next);
          }
        }
      };
      audio.ontimeupdate = () => {
        if (audio.duration) setProgress(audio.currentTime / audio.duration);
      };
    } catch {
      setError("Fout bij afspelen");
      setLoading(false);
      setPlaying(false);
    }
  }, [voiceId, stability, speed, autoPlay]);

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.ontimeupdate = null;
    }
    setPlaying(false);
    setLoading(false);
    setProgress(0);
  }

  function togglePlay() {
    if (!book) return;
    if (playing) {
      stopAudio();
    } else {
      speakChunk(chunkIdx, book);
    }
  }

  function goTo(idx: number) {
    if (!book) return;
    stopAudio();
    const next = Math.max(0, Math.min(idx, book.chunks.length - 1));
    setChunkIdx(next);
    saveProgress(book, next);
  }

  function clearBook() {
    stopAudio();
    setBook(null);
    setChunkIdx(0);
    localStorage.removeItem("reader_book");
  }

  const chunk = book?.chunks[chunkIdx] ?? "";
  const totalChunks = book?.chunks.length ?? 0;

  return (
    <div className="max-w-2xl mx-auto pt-14 md:pt-0 pb-24 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen size={22} className="text-terracotta" />
          <h1 className="font-display text-2xl text-brown">Luisteren</h1>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${showSettings ? "bg-terracotta text-cream" : "bg-warm text-brown-light hover:text-terracotta"}`}
        >
          <Settings2 size={16} />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="widget-card p-5 mb-4 flex flex-col gap-4">
          <p className="text-xs font-semibold text-brown-light uppercase tracking-wide">Instellingen</p>

          {/* Voice picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-brown">Stem</label>
            {voices.length === 0
              ? <p className="text-xs text-brown-light italic">Geen stemmen geladen (API key nodig)</p>
              : <select
                  value={voiceId}
                  onChange={e => setVoiceId(e.target.value)}
                  className="bg-warm rounded-xl px-3 py-2 text-sm text-brown border border-warm focus:outline-none focus:border-terracotta"
                >
                  {voices.map(v => (
                    <option key={v.voice_id} value={v.voice_id}>{v.name}</option>
                  ))}
                </select>
            }
          </div>

          {/* Speed */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-brown">Snelheid</label>
            <div className="flex gap-2">
              {SPEED_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors ${speed === s ? "bg-terracotta text-cream" : "bg-warm text-brown-light hover:text-brown"}`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>

          {/* Stability */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-brown">Stabiliteit stem <span className="text-brown-light font-normal">({Math.round(stability * 100)}%)</span></label>
            <input type="range" min={0} max={1} step={0.05} value={stability}
              onChange={e => setStability(parseFloat(e.target.value))}
              className="accent-terracotta" />
          </div>

          {/* Auto play */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setAutoPlay(!autoPlay)}
              className={`w-10 h-6 rounded-full transition-colors ${autoPlay ? "bg-terracotta" : "bg-warm border border-warm"} relative`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${autoPlay ? "left-5" : "left-1"}`} />
            </div>
            <span className="text-sm text-brown">Automatisch doorgaan</span>
          </label>
        </div>
      )}

      {/* Upload zone */}
      {!book && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          className="widget-card flex flex-col items-center justify-center gap-4 py-16 cursor-pointer hover:border-terracotta transition-colors border-2 border-dashed border-border"
        >
          <input ref={fileInputRef} type="file" accept=".pdf,.epub,.txt" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {parsing
            ? <><Loader size={32} className="text-terracotta animate-spin" /><p className="text-brown-light text-sm">Bestand verwerken...</p></>
            : <><Upload size={32} className="text-brown-light" /><div className="text-center"><p className="font-semibold text-brown">Sleep een boek hierheen</p><p className="text-sm text-brown-light mt-1">PDF, EPUB of TXT</p></div></>
          }
        </div>
      )}

      {error && (
        <div className="mt-3 bg-rose/10 border border-rose/30 rounded-2xl px-4 py-3 text-sm text-rose flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Reader */}
      {book && (
        <div className="flex flex-col gap-4">
          {/* Book header */}
          <div className="widget-card px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-12 rounded-lg bg-terracotta/20 flex items-center justify-center shrink-0">
                <BookOpen size={18} className="text-terracotta" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-brown truncate">{book.title}</p>
                <p className="text-xs text-brown-light">{totalChunks} fragmenten</p>
              </div>
            </div>
            <button onClick={clearBook} className="text-brown-light hover:text-rose transition-colors ml-3 shrink-0">
              <X size={16} />
            </button>
          </div>

          {/* Text display */}
          <div className="widget-card p-6 min-h-[220px]">
            <p className="text-xs font-semibold text-brown-light uppercase tracking-wide mb-4">
              Fragment {chunkIdx + 1} / {totalChunks}
            </p>
            <p className="text-brown leading-relaxed font-body text-base">{chunk}</p>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-warm rounded-full overflow-hidden">
            <div
              className="h-full bg-terracotta rounded-full transition-all duration-200"
              style={{ width: `${((chunkIdx + progress) / totalChunks) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-brown-light">
            <span>{Math.round(((chunkIdx) / totalChunks) * 100)}% gelezen</span>
            <span>{totalChunks - chunkIdx - 1} fragmenten resterend</span>
          </div>

          {/* Player controls */}
          <div className="widget-card px-6 py-5 flex items-center justify-center gap-6">
            <button
              onClick={() => goTo(chunkIdx - 1)}
              disabled={chunkIdx === 0}
              className="w-10 h-10 rounded-full bg-warm flex items-center justify-center text-brown hover:text-terracotta transition-colors disabled:opacity-30"
            >
              <SkipBack size={18} />
            </button>

            <button
              onClick={togglePlay}
              disabled={loading}
              className="w-16 h-16 rounded-full bg-terracotta text-cream flex items-center justify-center hover:bg-terracotta/80 transition-colors shadow-md disabled:opacity-60"
            >
              {loading
                ? <Loader size={24} className="animate-spin" />
                : playing
                ? <Pause size={24} />
                : <Play size={24} className="ml-1" />
              }
            </button>

            <button
              onClick={() => goTo(chunkIdx + 1)}
              disabled={chunkIdx >= totalChunks - 1}
              className="w-10 h-10 rounded-full bg-warm flex items-center justify-center text-brown hover:text-terracotta transition-colors disabled:opacity-30"
            >
              <SkipForward size={18} />
            </button>
          </div>

          {/* Chapter nav */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => goTo(chunkIdx - 10)}
              disabled={chunkIdx < 10}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-warm text-brown-light text-xs font-semibold hover:text-brown transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={14} /> −10
            </button>
            <div className="flex-1 text-center text-xs text-brown-light">
              <Volume2 size={12} className="inline mr-1" />
              {playing ? "Aan het afspelen..." : loading ? "Laden..." : "Gepauzeerd"}
            </div>
            <button
              onClick={() => goTo(chunkIdx + 10)}
              disabled={chunkIdx + 10 >= totalChunks}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-warm text-brown-light text-xs font-semibold hover:text-brown transition-colors disabled:opacity-30"
            >
              +10 <ChevronRight size={14} />
            </button>
          </div>

          {/* New book button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-center text-xs text-brown-light hover:text-terracotta transition-colors py-2"
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.epub,.txt" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            + Ander boek laden
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload, Play, Pause, SkipBack, SkipForward, Volume2,
  BookOpen, ChevronLeft, ChevronRight, Loader, X, Settings2, Library, Trash2, Plus,
} from "lucide-react";

type Voice = { voice_id: string; name: string };

type LibraryBook = {
  id: string;
  title: string;
  chunks: string[];
  chunkIdx: number;
  addedAt: string;
};

type WordTiming = {
  word: string;
  start: number;
  end: number;
};

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 2.0];
const LIBRARY_KEY = "reader_library_v1";

function loadLibrary(): LibraryBook[] {
  try {
    const saved = localStorage.getItem(LIBRARY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveLibrary(lib: LibraryBook[]) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib));
}

// Convert ElevenLabs character alignment to word timings
function buildWordTimings(alignment: {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}): WordTiming[] {
  const { characters, character_start_times_seconds, character_end_times_seconds } = alignment;
  const words: WordTiming[] = [];
  let wordStart = -1;
  let wordChars = "";

  for (let i = 0; i <= characters.length; i++) {
    const ch = characters[i];
    const isWordChar = ch && /\S/.test(ch);

    if (isWordChar) {
      if (wordStart === -1) wordStart = character_start_times_seconds[i];
      wordChars += ch;
    } else {
      if (wordChars.trim()) {
        words.push({
          word: wordChars,
          start: wordStart,
          end: character_end_times_seconds[i - 1],
        });
      }
      wordStart = -1;
      wordChars = "";
    }
  }
  return words;
}

export default function LuisterenPage() {
  const [library, setLibrary] = useState<LibraryBook[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<"library" | "reader">("library");

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
  const [wordTimings, setWordTimings] = useState<WordTiming[]>([]);
  const [activeWordIdx, setActiveWordIdx] = useState(-1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const activeBook = library.find(b => b.id === activeId) ?? null;
  const chunkIdx = activeBook?.chunkIdx ?? 0;
  const totalChunks = activeBook?.chunks.length ?? 0;

  useEffect(() => {
    setLibrary(loadLibrary());
    fetch("/api/reader/voices")
      .then(r => r.json())
      .then((v: Voice[]) => { if (Array.isArray(v) && v.length > 0) setVoices(v); })
      .catch(() => {});
  }, []);

  // Auto-scroll highlighted word into view
  useEffect(() => {
    if (activeWordIdx >= 0 && wordRefs.current[activeWordIdx]) {
      wordRefs.current[activeWordIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeWordIdx]);

  function updateProgress(id: string, idx: number) {
    setLibrary(prev => {
      const next = prev.map(b => b.id === id ? { ...b, chunkIdx: idx } : b);
      saveLibrary(next);
      return next;
    });
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
      const newBook: LibraryBook = {
        id: Date.now().toString(),
        title: data.title,
        chunks: data.chunks,
        chunkIdx: 0,
        addedAt: new Date().toISOString(),
      };
      setLibrary(prev => {
        const next = [newBook, ...prev];
        saveLibrary(next);
        return next;
      });
      setActiveId(newBook.id);
      setView("reader");
    } catch {
      setError("Fout bij verwerken van bestand");
    } finally {
      setParsing(false);
    }
  }

  function deleteBook(id: string) {
    if (activeId === id) { stopAudio(); setActiveId(null); setView("library"); }
    setLibrary(prev => {
      const next = prev.filter(b => b.id !== id);
      saveLibrary(next);
      return next;
    });
  }

  function openBook(id: string) {
    stopAudio();
    setActiveId(id);
    setView("reader");
    setError(null);
  }

  const speakChunk = useCallback(async (idx: number, book: LibraryBook) => {
    if (!book || idx >= book.chunks.length) { setPlaying(false); return; }
    setLoading(true);
    setError(null);
    setWordTimings([]);
    setActiveWordIdx(-1);

    try {
      const res = await fetch("/api/reader/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: book.chunks[idx], voiceId, stability, speed }),
      });
      if (!res.ok) { const e = await res.json(); setError(e.error ?? "TTS fout"); setLoading(false); setPlaying(false); return; }

      const data = await res.json();

      // Decode base64 audio
      const binary = atob(data.audio_base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "audio/mpeg" });

      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      // Build word timings
      const timings = data.alignment ? buildWordTimings(data.alignment) : [];
      setWordTimings(timings);
      wordRefs.current = new Array(timings.length).fill(null);

      if (!audioRef.current) audioRef.current = new Audio();
      const audio = audioRef.current;
      audio.src = url;
      setLoading(false);
      await audio.play();
      setPlaying(true);

      audio.ontimeupdate = () => {
        const t = audio.currentTime;
        if (audio.duration) setProgress(t / audio.duration);
        // Find active word
        const wi = timings.findLastIndex(w => w.start <= t);
        setActiveWordIdx(wi);
      };

      audio.onended = () => {
        setActiveWordIdx(-1);
        const next = idx + 1;
        if (next < book.chunks.length) {
          updateProgress(book.id, next);
          if (autoPlay) {
            speakChunk(next, { ...book, chunkIdx: next });
          } else {
            setPlaying(false);
          }
        } else {
          setPlaying(false);
        }
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
    setActiveWordIdx(-1);
    setWordTimings([]);
  }

  function togglePlay() {
    if (!activeBook) return;
    if (playing) { stopAudio(); }
    else { speakChunk(chunkIdx, activeBook); }
  }

  function goTo(idx: number) {
    if (!activeBook) return;
    stopAudio();
    const next = Math.max(0, Math.min(idx, totalChunks - 1));
    updateProgress(activeBook.id, next);
  }

  // ── Library view ──────────────────────────────────────────────────────────

  if (view === "library") {
    return (
      <div className="max-w-2xl mx-auto pt-14 md:pt-0 pb-24 px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Library size={22} className="text-terracotta" />
            <h1 className="font-display text-2xl text-brown">Bibliotheek</h1>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-terracotta text-cream text-sm font-semibold hover:bg-terracotta/80 transition-colors disabled:opacity-60"
          >
            {parsing ? <Loader size={15} className="animate-spin" /> : <Plus size={15} />}
            Boek toevoegen
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf,.epub,.txt" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); if (fileInputRef.current) fileInputRef.current.value = ""; }} />
        </div>

        {error && (
          <div className="mb-4 bg-rose/10 border border-rose/30 rounded-2xl px-4 py-3 text-sm text-rose flex items-center justify-between">
            {error} <button onClick={() => setError(null)}><X size={14} /></button>
          </div>
        )}

        {parsing && (
          <div className="widget-card flex items-center gap-3 px-5 py-4 mb-4">
            <Loader size={18} className="text-terracotta animate-spin shrink-0" />
            <p className="text-sm text-brown">Boek verwerken...</p>
          </div>
        )}

        {library.length === 0 && !parsing ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            className="widget-card flex flex-col items-center justify-center gap-4 py-16 cursor-pointer hover:border-terracotta transition-colors border-2 border-dashed border-border"
          >
            <Upload size={32} className="text-brown-light" />
            <div className="text-center">
              <p className="font-semibold text-brown">Sleep een boek hierheen</p>
              <p className="text-sm text-brown-light mt-1">PDF, EPUB of TXT</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {library.map(book => {
              const pct = Math.round((book.chunkIdx / book.chunks.length) * 100);
              return (
                <div key={book.id} className="widget-card px-5 py-4 flex items-center gap-4 group">
                  <div onClick={() => openBook(book.id)} className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer">
                    <div className="w-10 h-14 rounded-lg bg-terracotta/15 flex items-center justify-center shrink-0">
                      <BookOpen size={18} className="text-terracotta" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-brown truncate">{book.title}</p>
                      <p className="text-xs text-brown-light mt-0.5">{book.chunks.length} fragmenten</p>
                      <div className="mt-2 h-1 bg-warm rounded-full overflow-hidden">
                        <div className="h-full bg-terracotta rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-brown-light mt-1">{pct}% gelezen</p>
                    </div>
                  </div>
                  <button onClick={() => deleteBook(book.id)}
                    className="text-brown-light hover:text-rose transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Reader view ───────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto pt-14 md:pt-0 pb-24 px-4">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => { stopAudio(); setView("library"); }}
          className="flex items-center gap-1.5 text-brown-light hover:text-terracotta transition-colors text-sm font-semibold"
        >
          <ChevronLeft size={16} /> Bibliotheek
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${showSettings ? "bg-terracotta text-cream" : "bg-warm text-brown-light hover:text-terracotta"}`}
        >
          <Settings2 size={16} />
        </button>
      </div>

      {showSettings && (
        <div className="widget-card p-5 mb-4 flex flex-col gap-4">
          <p className="text-xs font-semibold text-brown-light uppercase tracking-wide">Instellingen</p>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-brown">Stem</label>
            {voices.length === 0
              ? <p className="text-xs text-brown-light italic">Geen stemmen geladen</p>
              : <select value={voiceId} onChange={e => setVoiceId(e.target.value)}
                  className="bg-warm rounded-xl px-3 py-2 text-sm text-brown border border-warm focus:outline-none focus:border-terracotta">
                  {voices.map(v => <option key={v.voice_id} value={v.voice_id}>{v.name}</option>)}
                </select>
            }
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-brown">Snelheid</label>
            <div className="flex gap-2">
              {SPEED_OPTIONS.map(s => (
                <button key={s} onClick={() => setSpeed(s)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors ${speed === s ? "bg-terracotta text-cream" : "bg-warm text-brown-light hover:text-brown"}`}>
                  {s}×
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-brown">Stabiliteit <span className="text-brown-light font-normal">({Math.round(stability * 100)}%)</span></label>
            <input type="range" min={0} max={1} step={0.05} value={stability}
              onChange={e => setStability(parseFloat(e.target.value))} className="accent-terracotta" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setAutoPlay(!autoPlay)}
              className={`w-10 h-6 rounded-full transition-colors relative ${autoPlay ? "bg-terracotta" : "bg-warm border border-warm"}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${autoPlay ? "left-5" : "left-1"}`} />
            </div>
            <span className="text-sm text-brown">Automatisch doorgaan</span>
          </label>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-rose/10 border border-rose/30 rounded-2xl px-4 py-3 text-sm text-rose flex items-center justify-between">
          {error} <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {activeBook && (
        <div className="flex flex-col gap-4">
          <div className="widget-card px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-12 rounded-lg bg-terracotta/20 flex items-center justify-center shrink-0">
              <BookOpen size={18} className="text-terracotta" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-brown truncate">{activeBook.title}</p>
              <p className="text-xs text-brown-light">Fragment {chunkIdx + 1} / {totalChunks}</p>
            </div>
          </div>

          {/* Text display with word highlighting */}
          <div className="widget-card p-6 min-h-[220px] overflow-y-auto max-h-72">
            {wordTimings.length > 0 ? (
              <p className="text-brown leading-relaxed font-body text-base">
                {wordTimings.map((w, i) => (
                  <span key={i}>
                    <span
                      ref={el => { wordRefs.current[i] = el; }}
                      className={`transition-colors duration-75 rounded px-0.5 ${
                        i === activeWordIdx
                          ? "bg-terracotta text-cream"
                          : i < activeWordIdx
                          ? "text-brown-light"
                          : "text-brown"
                      }`}
                    >
                      {w.word}
                    </span>
                    {" "}
                  </span>
                ))}
              </p>
            ) : (
              <p className="text-brown leading-relaxed font-body text-base">
                {activeBook.chunks[chunkIdx]}
              </p>
            )}
          </div>

          <div className="h-1.5 bg-warm rounded-full overflow-hidden">
            <div className="h-full bg-terracotta rounded-full transition-all duration-200"
              style={{ width: `${((chunkIdx + progress) / totalChunks) * 100}%` }} />
          </div>
          <div className="flex justify-between text-xs text-brown-light">
            <span>{Math.round((chunkIdx / totalChunks) * 100)}% gelezen</span>
            <span>{totalChunks - chunkIdx - 1} fragmenten resterend</span>
          </div>

          <div className="widget-card px-6 py-5 flex items-center justify-center gap-6">
            <button onClick={() => goTo(chunkIdx - 1)} disabled={chunkIdx === 0}
              className="w-10 h-10 rounded-full bg-warm flex items-center justify-center text-brown hover:text-terracotta transition-colors disabled:opacity-30">
              <SkipBack size={18} />
            </button>
            <button onClick={togglePlay} disabled={loading}
              className="w-16 h-16 rounded-full bg-terracotta text-cream flex items-center justify-center hover:bg-terracotta/80 transition-colors shadow-md disabled:opacity-60">
              {loading ? <Loader size={24} className="animate-spin" /> : playing ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </button>
            <button onClick={() => goTo(chunkIdx + 1)} disabled={chunkIdx >= totalChunks - 1}
              className="w-10 h-10 rounded-full bg-warm flex items-center justify-center text-brown hover:text-terracotta transition-colors disabled:opacity-30">
              <SkipForward size={18} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => goTo(chunkIdx - 10)} disabled={chunkIdx < 10}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-warm text-brown-light text-xs font-semibold hover:text-brown transition-colors disabled:opacity-30">
              <ChevronLeft size={14} /> −10
            </button>
            <div className="flex-1 text-center text-xs text-brown-light">
              <Volume2 size={12} className="inline mr-1" />
              {playing ? "Aan het afspelen..." : loading ? "Laden..." : "Gepauzeerd"}
            </div>
            <button onClick={() => goTo(chunkIdx + 10)} disabled={chunkIdx + 10 >= totalChunks}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-warm text-brown-light text-xs font-semibold hover:text-brown transition-colors disabled:opacity-30">
              +10 <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

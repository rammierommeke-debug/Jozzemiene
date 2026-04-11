"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Music, Upload, Trash2, Play, Pause, SkipBack, Loader, Plus, X } from "lucide-react";

type Track = { id: string; name: string; url: string; created_at: string };
type Playlist = { id: string; name: string; tracks: Track[] };

export default function MuziekPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTracks = useCallback(async () => {
    const res = await fetch("/api/tracks");
    const data = await res.json();
    if (Array.isArray(data)) setTracks(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTracks(); }, [fetchTracks]);

  // Sync audio src when current changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audio.src = current.url;
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    setProgress(0);
  }, [current]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const ext = file.name.split(".").pop() ?? "mp3";
    const presignRes = await fetch("/api/photos/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ext }),
    });
    const { signedUrl, filename, error: presignError } = await presignRes.json();
    if (presignError || !signedUrl) { setUploading(false); return; }

    await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/uploads/${filename}`;
    const name = file.name.replace(/\.[^.]+$/, "");

    await fetch("/api/tracks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url: publicUrl }),
    });

    await fetchTracks();
    setUploading(false);
    setShowAdd(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function playTrack(track: Track) {
    if (current?.id === track.id) {
      togglePlay();
    } else {
      setCurrent(track);
    }
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  }

  function handleRestart() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setProgress(0);
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  }

  async function deleteTrack(id: string) {
    if (current?.id === id) {
      audioRef.current?.pause();
      setCurrent(null);
      setPlaying(false);
    }
    await fetch(`/api/tracks/${id}`, { method: "DELETE" });
    setTracks((prev) => prev.filter((t) => t.id !== id));
  }

  function startRename(track: Track) {
    setEditingName(track.id);
    setNameValue(track.name);
  }

  async function saveRename(track: Track) {
    if (!nameValue.trim()) { setEditingName(null); return; }
    await fetch(`/api/tracks/${track.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameValue.trim() }),
    });
    setTracks((prev) => prev.map((t) => t.id === track.id ? { ...t, name: nameValue.trim() } : t));
    if (current?.id === track.id) setCurrent((c) => c ? { ...c, name: nameValue.trim() } : c);
    setEditingName(null);
  }

  function playNext() {
    if (!current) return;
    const idx = tracks.findIndex((t) => t.id === current.id);
    const next = tracks[(idx + 1) % tracks.length];
    if (next) setCurrent(next);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFile} />
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (a && a.duration) setProgress((a.currentTime / a.duration) * 100);
        }}
        onEnded={playNext}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Music className="text-brown-light" size={28} />
          <h1 className="font-display text-3xl text-brown">Muziek</h1>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-terracotta text-cream px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-terracotta/80 transition-colors"
        >
          <Plus size={16} />
          Nummer toevoegen
        </button>
      </div>

      {/* Upload panel */}
      {showAdd && (
        <div className="mb-6 bg-warm rounded-3xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-display text-brown text-lg">Nummer uploaden</p>
            <button onClick={() => setShowAdd(false)} className="text-brown-light hover:text-brown"><X size={18} /></button>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center gap-3 py-8 rounded-2xl border-2 border-dashed border-warm/80 hover:border-sage hover:bg-sage-light/20 transition-all group disabled:opacity-50"
          >
            {uploading ? (
              <Loader size={28} className="text-brown-light animate-spin" />
            ) : (
              <Upload size={28} className="text-brown-light group-hover:text-sage transition-colors" />
            )}
            <span className="text-sm text-brown-light group-hover:text-sage transition-colors">
              {uploading ? "Uploaden..." : "Klik om een audiobestand te kiezen"}
            </span>
            <span className="text-xs text-brown-light/60">MP3, WAV, FLAC, M4A, ...</span>
          </button>
        </div>
      )}

      {/* Now playing bar */}
      {current && (
        <div className="mb-6 bg-terracotta/10 border border-terracotta/20 rounded-3xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-terracotta/20 rounded-xl flex items-center justify-center shrink-0">
              <Music size={18} className="text-terracotta" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-brown truncate">{current.name}</p>
              <p className="text-xs text-brown-light">Nu aan het spelen</p>
            </div>
          </div>
          <div className="w-full h-2 bg-cream rounded-full cursor-pointer" onClick={handleSeek}>
            <div className="h-full bg-terracotta rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-center gap-4">
            <button onClick={handleRestart} className="text-brown-light hover:text-brown transition-colors">
              <SkipBack size={18} />
            </button>
            <button
              onClick={togglePlay}
              className="bg-terracotta text-cream rounded-full p-3 hover:bg-terracotta/80 transition-colors"
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button onClick={playNext} className="text-brown-light hover:text-brown transition-colors rotate-180">
              <SkipBack size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Track list */}
      {loading ? (
        <p className="text-brown-light text-center mt-10">Laden...</p>
      ) : tracks.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <Music size={40} className="text-warm" />
          <p className="text-brown-light">Nog geen nummers. Voeg je eerste nummer toe!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tracks.map((track, i) => {
            const isActive = current?.id === track.id;
            return (
              <div
                key={track.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl group transition-colors cursor-pointer ${
                  isActive ? "bg-terracotta/10" : "bg-warm hover:bg-warm/80"
                }`}
                onClick={() => playTrack(track)}
              >
                <span className="text-xs text-brown-light w-5 text-right shrink-0">{i + 1}</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isActive ? "bg-terracotta" : "bg-cream group-hover:bg-terracotta/20"} transition-colors`}>
                  {isActive && playing ? (
                    <Pause size={14} className="text-cream" />
                  ) : (
                    <Play size={14} className={isActive ? "text-cream" : "text-brown-light group-hover:text-terracotta"} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {editingName === track.id ? (
                    <input
                      autoFocus
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      onBlur={() => saveRename(track)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveRename(track); if (e.key === "Escape") setEditingName(null); }}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm bg-cream border border-sage rounded-lg px-2 py-0.5 text-brown focus:outline-none w-full"
                    />
                  ) : (
                    <p className={`text-sm font-semibold truncate ${isActive ? "text-terracotta" : "text-brown"}`}>
                      {track.name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => startRename(track)}
                    className="p-1.5 rounded-lg text-brown-light hover:text-brown hover:bg-cream transition-colors text-xs"
                    title="Naam wijzigen"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteTrack(track.id)}
                    className="p-1.5 rounded-lg text-brown-light hover:text-rose hover:bg-rose-light/30 transition-colors"
                    title="Verwijderen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

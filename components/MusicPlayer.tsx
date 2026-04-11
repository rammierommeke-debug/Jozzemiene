"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Music, Play, Pause, Upload, X, SkipBack, ChevronDown, ChevronUp, Loader } from "lucide-react";

type Track = { id: string; name: string; url: string };

export default function MusicPlayer() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTracks = useCallback(async () => {
    const res = await fetch("/api/tracks");
    const data = await res.json();
    if (Array.isArray(data)) setTracks(data);
  }, []);

  useEffect(() => { fetchTracks(); }, [fetchTracks]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const ext = file.name.split(".").pop() ?? "mp3";
    // 1. Presign
    const presignRes = await fetch("/api/photos/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ext }),
    });
    const { signedUrl, filename, error: presignError } = await presignRes.json();
    if (presignError || !signedUrl) { setUploading(false); return; }

    // 2. Upload to Supabase Storage
    await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });

    // 3. Save track
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function play(track: Track) {
    setCurrent(track);
    setProgress(0);
    setPlaying(true);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); } else { audio.play(); }
    setPlaying(!playing);
  }

  function handleRestart() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setProgress(0);
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setProgress((audio.currentTime / audio.duration) * 100);
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

  return (
    <div className="border-t border-warm/60 bg-warm/50">
      <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFile} />

      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-warm transition-colors"
      >
        <Music size={14} className="text-brown-light shrink-0" />
        <span className="flex-1 text-left text-xs font-semibold text-brown-light">Muziek</span>
        {collapsed ? <ChevronUp size={14} className="text-brown-light" /> : <ChevronDown size={14} className="text-brown-light" />}
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          {/* Now playing */}
          {current && (
            <div className="bg-cream rounded-2xl p-2.5 flex flex-col gap-2">
              <p className="text-xs text-brown font-semibold truncate">{current.name}</p>
              <div className="w-full h-1.5 bg-warm rounded-full cursor-pointer" onClick={handleSeek}>
                <div className="h-full bg-terracotta rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-center justify-center gap-3">
                <button onClick={handleRestart} className="text-brown-light hover:text-brown transition-colors">
                  <SkipBack size={13} />
                </button>
                <button
                  onClick={togglePlay}
                  className="bg-terracotta text-cream rounded-full p-1.5 hover:bg-terracotta/80 transition-colors"
                >
                  {playing ? <Pause size={13} /> : <Play size={13} />}
                </button>
              </div>
              <audio
                ref={audioRef}
                src={current.url}
                autoPlay
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => { setPlaying(false); setProgress(0); }}
              />
            </div>
          )}

          {/* Track library */}
          {tracks.length > 0 && (
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer group transition-colors ${
                    current?.id === track.id ? "bg-terracotta/10" : "hover:bg-cream"
                  }`}
                  onClick={() => play(track)}
                >
                  <Music size={11} className={current?.id === track.id ? "text-terracotta" : "text-brown-light"} />
                  <span className={`text-xs truncate flex-1 ${current?.id === track.id ? "text-terracotta font-semibold" : "text-brown"}`}>
                    {track.name}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTrack(track.id); }}
                    className="opacity-0 group-hover:opacity-100 text-brown-light hover:text-rose transition-all"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl border-2 border-dashed border-warm hover:border-sage hover:bg-sage-light/20 transition-all group disabled:opacity-50"
          >
            {uploading ? (
              <Loader size={13} className="text-brown-light animate-spin" />
            ) : (
              <Upload size={13} className="text-brown-light group-hover:text-sage transition-colors" />
            )}
            <span className="text-xs text-brown-light group-hover:text-sage transition-colors">
              {uploading ? "Uploaden..." : "Nummer toevoegen"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Music, Play, Pause, Upload, X, SkipBack } from "lucide-react";

export default function MusicPlayer() {
  const [track, setTrack] = useState<{ name: string; url: string } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (track?.url.startsWith("blob:")) URL.revokeObjectURL(track.url);
    };
  }, [track]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (track?.url.startsWith("blob:")) URL.revokeObjectURL(track.url);
    const url = URL.createObjectURL(file);
    setTrack({ name: file.name.replace(/\.[^.]+$/, ""), url });
    setPlaying(false);
    setProgress(0);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
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

  function handleEnded() {
    setPlaying(false);
    setProgress(0);
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * audio.duration;
  }

  function handleRemove() {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.src = ""; }
    if (track?.url.startsWith("blob:")) URL.revokeObjectURL(track.url);
    setTrack(null);
    setPlaying(false);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="border-t border-warm/60 bg-warm/50 px-3 py-3">
      <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFile} />

      {track ? (
        <div className="flex flex-col gap-2">
          {/* Track name */}
          <div className="flex items-center gap-2">
            <Music size={12} className="text-brown-light shrink-0" />
            <p className="text-xs text-brown font-semibold truncate flex-1">{track.name}</p>
            <button onClick={handleRemove} className="text-brown-light hover:text-brown transition-colors">
              <X size={12} />
            </button>
          </div>

          {/* Progress bar */}
          <div
            className="w-full h-1.5 bg-cream rounded-full cursor-pointer"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-terracotta rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button onClick={handleRestart} className="text-brown-light hover:text-brown transition-colors">
              <SkipBack size={14} />
            </button>
            <button
              onClick={togglePlay}
              className="bg-terracotta text-cream rounded-full p-2 hover:bg-terracotta/80 transition-colors"
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-brown-light hover:text-brown transition-colors"
              title="Ander nummer"
            >
              <Upload size={14} />
            </button>
          </div>

          <audio
            ref={audioRef}
            src={track.url}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
          />
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center gap-2 py-2 px-3 rounded-2xl border-2 border-dashed border-warm hover:border-sage hover:bg-sage-light/20 transition-all group"
        >
          <Music size={14} className="text-brown-light group-hover:text-sage transition-colors shrink-0" />
          <span className="text-xs text-brown-light group-hover:text-sage transition-colors">Muziek toevoegen</span>
          <Upload size={12} className="text-brown-light group-hover:text-sage ml-auto transition-colors" />
        </button>
      )}
    </div>
  );
}

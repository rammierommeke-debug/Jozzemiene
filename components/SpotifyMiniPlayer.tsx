"use client";

import { useSpotify } from "@/lib/spotifyContext";
import { useEffect, useRef, useState } from "react";

const DEFAULT_POS = { x: 24, y: null as number | null }; // null y = stick to bottom

export default function SpotifyMiniPlayer() {
  const { state, playerReady, connected, playerRef } = useSpotify();
  const [pos, setPos] = useState<{ x: number; y: number | null }>(DEFAULT_POS);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  // Load saved position from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("spotify_mini_pos");
      if (saved) setPos(JSON.parse(saved));
    } catch {}
  }, []);

  function onMouseDown(e: React.MouseEvent) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
    e.preventDefault();
  }

  useEffect(() => {
    if (!dragging) return;

    function onMouseMove(e: MouseEvent) {
      const x = Math.max(0, Math.min(window.innerWidth - (ref.current?.offsetWidth ?? 220), e.clientX - dragOffset.current.x));
      const y = Math.max(0, Math.min(window.innerHeight - (ref.current?.offsetHeight ?? 44), e.clientY - dragOffset.current.y));
      setPos({ x, y });
    }

    function onMouseUp() {
      setDragging(false);
      setPos(prev => {
        localStorage.setItem("spotify_mini_pos", JSON.stringify(prev));
        return prev;
      });
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging]);

  // Touch support
  function onTouchStart(e: React.TouchEvent) {
    if (!ref.current) return;
    const touch = e.touches[0];
    const rect = ref.current.getBoundingClientRect();
    dragOffset.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    setDragging(true);
  }

  useEffect(() => {
    if (!dragging) return;

    function onTouchMove(e: TouchEvent) {
      const touch = e.touches[0];
      const x = Math.max(0, Math.min(window.innerWidth - (ref.current?.offsetWidth ?? 220), touch.clientX - dragOffset.current.x));
      const y = Math.max(0, Math.min(window.innerHeight - (ref.current?.offsetHeight ?? 44), touch.clientY - dragOffset.current.y));
      setPos({ x, y });
      e.preventDefault();
    }

    function onTouchEnd() {
      setDragging(false);
      setPos(prev => {
        localStorage.setItem("spotify_mini_pos", JSON.stringify(prev));
        return prev;
      });
    }

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [dragging]);

  if (!connected || !playerReady || !state?.title) return null;

  const style: React.CSSProperties = {
    left: pos.x,
    ...(pos.y !== null ? { top: pos.y } : { bottom: 24 }),
    cursor: dragging ? "grabbing" : "grab",
  };

  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={style}
      className="fixed z-50 flex items-center gap-2.5 bg-[#1DB954] text-white px-4 py-2.5 rounded-full shadow-lg text-sm font-semibold max-w-[240px] select-none"
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${state.playing ? "bg-white animate-pulse" : "bg-white/60"}`} />
      <span className="truncate">{state.title}</span>
      <span className="text-white/60 shrink-0">·</span>
      <span className="truncate text-white/80 font-normal">{state.artist}</span>
      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={() => playerRef.current?.togglePlay()}
        className="ml-1 shrink-0 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
        title={state.playing ? "Pauzeer" : "Speel"}
      >
        {state.playing
          ? <span className="flex gap-0.5"><span className="w-0.5 h-3 bg-white rounded-full"/><span className="w-0.5 h-3 bg-white rounded-full"/></span>
          : <span className="ml-px border-l-[8px] border-y-[5px] border-y-transparent border-l-white" />
        }
      </button>
    </div>
  );
}

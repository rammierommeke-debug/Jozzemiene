"use client";

import { useSpotify } from "@/lib/spotifyContext";
import { useRouter } from "next/navigation";

export default function SpotifyMiniPlayer() {
  const { state, playerReady, connected } = useSpotify();
  const router = useRouter();

  if (!connected || !playerReady || !state?.title) return null;

  return (
    <button
      onClick={() => router.push("/")}
      className="hidden md:flex fixed bottom-6 left-6 z-50 items-center gap-2.5 bg-[#1DB954] text-white px-4 py-2.5 rounded-full shadow-lg hover:bg-[#1aa34a] active:scale-95 transition-all text-sm font-semibold max-w-[220px]"
      title="Ga naar Spotify widget"
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${state.playing ? "bg-white animate-pulse" : "bg-white/60"}`} />
      <span className="truncate">{state.title}</span>
      <span className="text-white/70 shrink-0">·</span>
      <span className="truncate text-white/80 font-normal">{state.artist}</span>
    </button>
  );
}

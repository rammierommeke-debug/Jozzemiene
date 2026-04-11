"use client";

import { useState, useEffect } from "react";
import { Music, X, ChevronDown, ChevronUp } from "lucide-react";

function toEmbedUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (!url.hostname.includes("spotify.com")) return null;
    // e.g. /playlist/abc123 → /embed/playlist/abc123
    const embedPath = url.pathname.replace(/^\//, "embed/");
    return `https://open.spotify.com/${embedPath}?utm_source=generator`;
  } catch {
    return null;
  }
}

export default function MusicPlayer() {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("spotify_embed");
    if (saved) setEmbedUrl(saved);
  }, []);

  function handleLoad() {
    const url = toEmbedUrl(input);
    if (!url) { setError(true); return; }
    setError(false);
    setEmbedUrl(url);
    localStorage.setItem("spotify_embed", url);
    setInput("");
  }

  function handleClear() {
    setEmbedUrl(null);
    localStorage.removeItem("spotify_embed");
  }

  return (
    <div className="border-t border-warm/60 bg-warm/50">
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
        <div className="px-3 pb-3">
          {embedUrl ? (
            <div className="relative">
              <iframe
                src={embedUrl}
                width="100%"
                height="152"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="rounded-2xl"
              />
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 bg-brown/70 text-cream rounded-full p-1 hover:bg-brown transition-colors"
                title="Verwijderen"
              >
                <X size={10} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleLoad()}
                placeholder="Plak een Spotify-link..."
                className={`w-full bg-cream rounded-xl border px-3 py-2 text-xs text-brown focus:outline-none ${
                  error ? "border-rose" : "border-warm focus:border-sage"
                }`}
              />
              {error && <p className="text-xs text-rose">Geen geldige Spotify-link</p>}
              <button
                onClick={handleLoad}
                className="w-full bg-[#1DB954] text-white rounded-xl py-1.5 text-xs font-semibold hover:bg-[#1aa34a] transition-colors"
              >
                Laden
              </button>
              <p className="text-xs text-brown-light text-center leading-tight">
                Werkt met nummers, afspeellijsten & albums
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

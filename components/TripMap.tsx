"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, MapPin } from "lucide-react";

type PickedPlace = { name: string; lat: number; lng: number; country: string };

interface TripMapProps {
  places: { name: string; lat?: number; lng?: number }[];
  onAddPlace: (place: PickedPlace) => void;
  coverColor: string;
}

export default function TripMap({ places, onAddPlace, coverColor }: TripMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").Marker[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [preview, setPreview] = useState<PickedPlace | null>(null);
  const previewMarkerRef = useRef<import("leaflet").Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      // Fix voor leaflet icons in Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!).setView([20, 0], 2);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      // Klik op kaart
      map.on("click", async (e) => {
        const { lat, lng } = e.latlng;
        // Reverse geocode via Nominatim
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "Accept-Language": "nl" } }
          );
          const data = await res.json();
          const name = data.name || data.display_name?.split(",")[0] || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          const country = data.address?.country || "";
          setPreview({ name, lat, lng, country });

          // Preview marker
          if (previewMarkerRef.current) previewMarkerRef.current.remove();
          const marker = L.marker([lat, lng]).addTo(map);
          previewMarkerRef.current = marker;
        } catch {
          const name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setPreview({ name, lat, lng, country: "" });
          if (previewMarkerRef.current) previewMarkerRef.current.remove();
          const marker = L.marker([lat, lng]).addTo(map);
          previewMarkerRef.current = marker;
        }
      });
    });

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Bestaande plekken op kaart tonen
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      places.forEach((place) => {
        if (place.lat !== undefined && place.lng !== undefined) {
          const icon = L.divIcon({
            className: "",
            html: `<div style="background:${coverColor};color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">✓</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          const marker = L.marker([place.lat, place.lng], { icon })
            .addTo(mapInstanceRef.current!)
            .bindTooltip(place.name, { permanent: false });
          markersRef.current.push(marker);
        }
      });
    });
  }, [places, coverColor]);

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
        { headers: { "Accept-Language": "nl" } }
      );
      const data = await res.json();
      setResults(data.map((r: { display_name: string; lat: string; lon: string; address?: { country?: string } }) => ({
        name: r.display_name.split(",")[0],
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        country: r.address?.country || r.display_name.split(",").slice(-1)[0].trim(),
      })));
    } catch {}
    setSearching(false);
  }

  function flyTo(place: PickedPlace) {
    import("leaflet").then((L) => {
      mapInstanceRef.current?.flyTo([place.lat, place.lng], 12, { duration: 1.2 });
      setPreview(place);
      setResults([]);
      setQuery(place.name);
      if (previewMarkerRef.current) previewMarkerRef.current.remove();
      const marker = L.marker([place.lat, place.lng]).addTo(mapInstanceRef.current!);
      previewMarkerRef.current = marker;
    });
  }

  function confirmAdd() {
    if (!preview) return;
    onAddPlace(preview);
    if (previewMarkerRef.current) previewMarkerRef.current.remove();
    previewMarkerRef.current = null;
    setPreview(null);
    setQuery("");
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Zoekbalk */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Zoek een plek (bv. Tokyo, Eiffeltoren...)"
            className="w-full bg-cream rounded-xl border border-warm px-4 py-2 pr-10 text-sm text-brown focus:outline-none focus:border-terracotta"
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-brown-light hover:text-rose">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={search}
          disabled={searching}
          className="bg-terracotta text-cream px-4 py-2 rounded-xl text-sm font-semibold hover:bg-terracotta/80 transition-colors disabled:opacity-50"
        >
          {searching ? "..." : <Search size={16} />}
        </button>
      </div>

      {/* Zoekresultaten */}
      {results.length > 0 && (
        <div className="bg-cream rounded-2xl border border-warm overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => flyTo(r)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-warm transition-colors text-left border-b border-warm last:border-0"
            >
              <MapPin size={14} className="text-terracotta shrink-0" />
              <div>
                <p className="text-sm text-brown font-semibold">{r.name}</p>
                <p className="text-xs text-brown-light">{r.country}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Kaart */}
      <div className="relative rounded-3xl overflow-hidden border border-warm" style={{ height: 380 }}>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
        <div className="absolute bottom-3 left-3 bg-white/80 backdrop-blur rounded-xl px-3 py-1.5 text-xs text-brown-light pointer-events-none">
          Klik op de kaart om een plek toe te voegen
        </div>
      </div>

      {/* Preview popup */}
      {preview && (
        <div className="bg-warm rounded-2xl border border-warm p-4 flex items-center gap-3">
          <MapPin size={20} className="text-terracotta shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-display text-brown truncate">{preview.name}</p>
            {preview.country && <p className="text-xs text-brown-light">{preview.country}</p>}
          </div>
          <button
            onClick={confirmAdd}
            className="bg-terracotta text-cream px-4 py-2 rounded-xl text-sm font-semibold hover:bg-terracotta/80 transition-colors whitespace-nowrap"
          >
            + Toevoegen
          </button>
          <button onClick={() => { setPreview(null); previewMarkerRef.current?.remove(); previewMarkerRef.current = null; }} className="text-brown-light hover:text-rose transition-colors">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

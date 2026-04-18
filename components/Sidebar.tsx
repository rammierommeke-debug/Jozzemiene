"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Paintbrush, BookMarked, Eye, Pencil, Maximize, Minimize, Camera, Check, Loader, LogOut } from "lucide-react";
import { useTheme } from "@/lib/themeContext";
import { getIcon } from "@/lib/iconMap";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";

export default function Sidebar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  const { config, setPanelOpen } = useTheme();
  const { data: session } = useSession();
  const navItems = config.navItems;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasNewEvents, setHasNewEvents] = useState(false);
  const [camStatus, setCamStatus] = useState<"idle" | "uploading" | "done">("idle");
  const cameraRef = useRef<HTMLInputElement>(null);

  async function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCamStatus("uploading");
    try {
      const albums = await fetch("/api/albums").then(r => r.json());
      let albumId = albums.find((a: { name: string; id: string }) => a.name.toLowerCase() === "live gallery")?.id;
      if (!albumId) {
        const created = await fetch("/api/albums", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Live Gallery", emoji: "📷" }),
        }).then(r => r.json());
        albumId = created.id;
      }
      const ext = file.name.split(".").pop() ?? "jpg";
      const { signedUrl, filename } = await fetch("/api/photos/presign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ext }),
      }).then(r => r.json());
      await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      await fetch("/api/photos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `${supabaseUrl}/storage/v1/object/public/uploads/${filename}`, caption: "", album_id: albumId }),
      });
      setCamStatus("done");
      setTimeout(() => setCamStatus("idle"), 2500);
    } catch { setCamStatus("idle"); }
    if (cameraRef.current) cameraRef.current.value = "";
  }

  useEffect(() => {
    async function checkNew() {
      try {
        const res = await fetch("/api/events");
        const data: { created_at?: string }[] = await res.json();
        const seen = localStorage.getItem("kalender_seen_at");
        if (!seen) { setHasNewEvents(data.length > 0); return; }
        setHasNewEvents(data.some(e => e.created_at && e.created_at > seen));
      } catch {}
    }
    checkNew();
    const id = setInterval(checkNew, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-warm border-r border-warm flex-col shadow-sm">
        <div className="p-6 border-b border-warm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 mb-1">
              <Heart className="text-rose fill-rose" size={20} />
              <span className="font-handwriting text-2xl text-brown">Jozzemiene</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Link href="/feedback"
                className="w-8 h-8 rounded-xl bg-cream flex items-center justify-center text-brown-light hover:text-terracotta hover:bg-terracotta/10 transition-colors font-bold text-sm"
                title="Feedback">
                !
              </Link>
              <button
                onClick={() => setPanelOpen(true)}
                className="w-8 h-8 rounded-xl bg-cream flex items-center justify-center text-brown-light hover:text-terracotta hover:bg-terracotta/10 transition-colors"
                title="Verven"
              >
                <Paintbrush size={15} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-7">
            <BookMarked size={11} className="text-brown-light" />
            <p className="text-brown-light text-xs font-body">built to remember</p>
          </div>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          {navItems.map(({ href, iconName, label }) => {
            const Icon = getIcon(iconName);
            const active = pathname === href;
            const isKalender = href === "/kalender";

            if (isKalender) {
              return (
                <div key={href} className="relative group/kal">
                  <Link
                    href={href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 w-full ${
                      active
                        ? "bg-terracotta text-cream shadow-sm"
                        : "text-brown hover:bg-rose-light/40 hover:text-terracotta"
                    }`}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span className="font-body font-semibold text-sm">{label}</span>
                  </Link>
                  {/* Submenu */}
                  <div className="absolute left-full top-0 ml-2 hidden group-hover/kal:flex flex-col bg-cream border border-warm rounded-2xl shadow-lg overflow-hidden z-50 min-w-[170px]">
                    <Link href="/kalender" className="flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-brown hover:bg-warm transition-colors">
                      <Eye size={15} className="text-sage shrink-0" />
                      Agenda bekijken
                    </Link>
                    <div className="h-px bg-warm" />
                    <Link href="/kalender?mode=bewerken" className="flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-brown hover:bg-warm transition-colors">
                      <Pencil size={15} className="text-terracotta shrink-0" />
                      Agenda bewerken
                    </Link>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${
                  active
                    ? "bg-terracotta text-cream shadow-sm"
                    : "text-brown hover:bg-rose-light/40 hover:text-terracotta"
                }`}
              >
                <div className="relative shrink-0">
                  <Icon size={18} />
                  {href === "/kalender" && hasNewEvents && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose" />
                  )}
                </div>
                <span className="font-body font-semibold text-sm">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-warm flex items-center justify-between">
          <p className="text-brown-light text-xs font-body">gemaakt met liefde 🌿</p>
          {session && (
            <button onClick={() => signOut({ callbackUrl: "/login" })}
              title="Uitloggen"
              className="flex items-center gap-1.5 text-brown-light hover:text-terracotta transition-colors text-xs font-semibold">
              <LogOut size={14} />
              {session.user?.name === "roel" ? "Roel" : "Emma"}
            </button>
          )}
        </div>
      </aside>

      {/* Mobiele top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-warm border-b border-warm px-4 py-3 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Heart className="text-rose fill-rose" size={18} />
            <span className="font-handwriting text-xl text-brown">Jozzemiene</span>
          </div>
          <div className="flex items-center gap-1 ml-6">
            <BookMarked size={9} className="text-brown-light" />
            <p className="text-brown-light text-[10px] font-body leading-tight">built to remember</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleCapture} className="hidden" />
          <button onClick={() => cameraRef.current?.click()} disabled={camStatus === "uploading"}
            className="w-8 h-8 rounded-xl bg-cream flex items-center justify-center text-brown-light hover:text-terracotta transition-colors disabled:opacity-50">
            {camStatus === "uploading" ? <Loader size={15} className="animate-spin" /> : camStatus === "done" ? <Check size={15} className="text-sage" /> : <Camera size={15} />}
          </button>
          <button onClick={toggleFullscreen}
            className="w-8 h-8 rounded-xl bg-cream flex items-center justify-center text-brown-light hover:text-terracotta transition-colors">
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
          <Link href="/feedback"
            className="w-8 h-8 rounded-xl bg-cream flex items-center justify-center text-brown-light hover:text-terracotta transition-colors font-bold text-sm"
            title="Feedback">
            !
          </Link>
          <button onClick={() => setPanelOpen(true)}
            className="w-8 h-8 rounded-xl bg-cream flex items-center justify-center text-brown-light hover:text-terracotta transition-colors"
            title="Verven">
            <Paintbrush size={15} />
          </button>
        </div>
      </div>

      {/* Mobiele bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-warm border-t border-warm">
        <div className="flex items-center overflow-x-auto scrollbar-hide px-2 py-2" style={{ scrollbarWidth: "none" }}>
          {navItems.map(({ href, iconName, label }) => {
            const Icon = getIcon(iconName);
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all shrink-0 ${
                  active ? "text-terracotta" : "text-brown-light"
                }`}
              >
                <div className="relative">
                  <Icon size={20} />
                  {href === "/kalender" && hasNewEvents && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose" />
                  )}
                </div>
                <span className="text-[9px] font-semibold leading-none whitespace-nowrap">{label.split(" ")[0]}</span>
              </Link>
            );
          })}
          {session && (
            <button onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-brown-light shrink-0">
              <LogOut size={20} />
              <span className="text-[9px] font-semibold leading-none">Uit</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}

"use client";

import Image from "next/image";
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
  const brandName = config.pageTitle || "Jozzemiene";

  async function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCamStatus("uploading");

    try {
      const albums = await fetch("/api/albums").then((r) => r.json());
      let albumId = albums.find((a: { name: string; id: string }) => a.name.toLowerCase() === "live gallery")?.id;

      if (!albumId) {
        const created = await fetch("/api/albums", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Live Gallery", emoji: "📷" }),
        }).then((r) => r.json());
        albumId = created.id;
      }

      const ext = file.name.split(".").pop() ?? "jpg";
      const { signedUrl, filename } = await fetch("/api/photos/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ext }),
      }).then((r) => r.json());

      await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `${supabaseUrl}/storage/v1/object/public/uploads/${filename}`,
          caption: "",
          album_id: albumId,
        }),
      });

      setCamStatus("done");
      setTimeout(() => setCamStatus("idle"), 2500);
    } catch {
      setCamStatus("idle");
    }

    if (cameraRef.current) cameraRef.current.value = "";
  }

  useEffect(() => {
    async function checkNew() {
      try {
        const res = await fetch("/api/events");
        const data: { created_at?: string }[] = await res.json();
        const seen = localStorage.getItem("kalender_seen_at");
        if (!seen) {
          setHasNewEvents(data.length > 0);
          return;
        }
        setHasNewEvents(data.some((e) => e.created_at && e.created_at > seen));
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
      <aside className="hidden md:flex fixed left-0 top-0 z-20 h-screen w-72 p-4">
        <div className="soft-panel relative flex h-full flex-col overflow-hidden rounded-[2rem]">
          <div className="petal-dot left-5 top-8 h-24 w-24" />
          <div className="petal-dot bottom-16 right-4 h-28 w-28" />

          <div className="border-b border-white/50 p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 shadow-sm">
                  <Heart className="fill-rose text-rose" size={18} />
                </div>
                <Image
                  src="/branding/jozzemiene-logo.png"
                  alt={brandName}
                  width={190}
                  height={56}
                  className="h-11 w-auto max-w-[180px] object-contain"
                  priority
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Link
                  href="/feedback"
                  className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/70 text-sm font-bold text-brown-light shadow-sm transition-colors hover:bg-white hover:text-terracotta"
                  title="Feedback"
                >
                  !
                </Link>
                <button
                  onClick={() => setPanelOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/70 text-brown-light shadow-sm transition-colors hover:bg-white hover:text-terracotta"
                  title="Verven"
                >
                  <Paintbrush size={15} />
                </button>
              </div>
            </div>

            <div className="ml-[3.2rem] mt-1 flex items-center gap-1.5">
              <BookMarked size={11} className="text-brown-light" />
              <p className="text-xs uppercase tracking-[0.18em] text-brown-light">{config.tagline || "built to remember"}</p>
            </div>
          </div>

          <nav className="sidebar-nav flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-1.5">
              {navItems.map(({ href, iconName, label }) => {
                const Icon = getIcon(iconName);
                const active = pathname === href;
                const itemClass = active
                  ? "bg-gradient-to-r from-terracotta to-[#d07c63] text-cream shadow-[0_12px_25px_rgba(194,113,79,0.22)]"
                  : "text-brown hover:bg-white/70 hover:text-terracotta";

                if (href === "/kalender") {
                  return (
                    <div key={href} className="group/kal relative">
                      <Link href={href} className={`flex w-full items-center gap-3 rounded-[1.35rem] px-4 py-3.5 transition-all duration-200 ${itemClass}`}>
                        <div className="relative shrink-0">
                          <Icon size={18} />
                          {hasNewEvents && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose" />}
                        </div>
                        <span className="text-sm font-semibold">{label}</span>
                      </Link>

                      <div className="absolute left-full top-0 z-50 ml-3 hidden min-w-[178px] flex-col overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/95 shadow-xl backdrop-blur-md group-hover/kal:flex">
                        <Link href="/kalender" className="flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-brown transition-colors hover:bg-warm/70">
                          <Eye size={15} className="shrink-0 text-sage" />
                          Agenda bekijken
                        </Link>
                        <div className="h-px bg-warm/70" />
                        <Link href="/kalender?mode=bewerken" className="flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-brown transition-colors hover:bg-warm/70">
                          <Pencil size={15} className="shrink-0 text-terracotta" />
                          Agenda bewerken
                        </Link>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link key={href} href={href} className={`flex items-center gap-3 rounded-[1.35rem] px-4 py-3.5 transition-all duration-200 ${itemClass}`}>
                    <Icon size={18} className="shrink-0" />
                    <span className="text-sm font-semibold">{label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="flex items-center justify-between border-t border-white/50 p-4">
            <p className="text-xs text-brown-light">gemaakt met liefde</p>
            {session && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Uitloggen"
                className="flex items-center gap-1.5 text-xs font-semibold text-brown-light transition-colors hover:text-terracotta"
              >
                <LogOut size={14} />
                {session.user?.name === "roel" ? "Roel" : "Emma"}
              </button>
            )}
          </div>
        </div>
      </aside>

      <div className="fixed left-0 right-0 top-0 z-40 px-3 pt-3 md:hidden">
        <div className="soft-panel flex items-center justify-between rounded-[1.75rem] border-white/60 px-4 py-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/70 shadow-sm">
                <Heart className="fill-rose text-rose" size={15} />
              </div>
              <Image
                src="/branding/jozzemiene-logo.png"
                alt={brandName}
                width={164}
                height={48}
                className="h-8 w-auto max-w-[150px] object-contain"
                priority
              />
            </div>

            <div className="ml-10 mt-1 flex items-center gap-1">
              <BookMarked size={9} className="text-brown-light" />
              <p className="text-[10px] uppercase tracking-[0.16em] text-brown-light">{config.tagline || "built to remember"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleCapture} className="hidden" />
            <button
              onClick={() => cameraRef.current?.click()}
              disabled={camStatus === "uploading"}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/70 text-brown-light shadow-sm transition-colors hover:text-terracotta disabled:opacity-50"
            >
              {camStatus === "uploading" ? <Loader size={15} className="animate-spin" /> : camStatus === "done" ? <Check size={15} className="text-sage" /> : <Camera size={15} />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/70 text-brown-light shadow-sm transition-colors hover:text-terracotta"
            >
              {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            </button>
            <Link
              href="/feedback"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/70 text-sm font-bold text-brown-light shadow-sm transition-colors hover:text-terracotta"
              title="Feedback"
            >
              !
            </Link>
            <button
              onClick={() => setPanelOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/70 text-brown-light shadow-sm transition-colors hover:text-terracotta"
              title="Verven"
            >
              <Paintbrush size={15} />
            </button>
          </div>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 md:hidden">
        <div className="soft-panel flex items-center overflow-x-auto rounded-[1.75rem] border-white/60 px-2 py-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {navItems.map(({ href, iconName, label }) => {
            const Icon = getIcon(iconName);
            const active = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-1 transition-all ${active ? "bg-white/70 text-terracotta" : "text-brown-light"}`}
              >
                <div className="relative">
                  <Icon size={20} />
                  {href === "/kalender" && hasNewEvents && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose" />}
                </div>
                <span className="whitespace-nowrap text-[9px] font-semibold leading-none">{label.split(" ")[0]}</span>
              </Link>
            );
          })}

          {session && (
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-1 text-brown-light">
              <LogOut size={20} />
              <span className="text-[9px] font-semibold leading-none">Uit</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Paintbrush, BookMarked } from "lucide-react";
import { useTheme } from "@/lib/themeContext";
import { getIcon } from "@/lib/iconMap";

export default function Sidebar() {
  const pathname = usePathname();
  const { config, setPanelOpen } = useTheme();
  const navItems = config.navItems;

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
            <button
              onClick={() => setPanelOpen(true)}
              className="w-8 h-8 rounded-xl bg-cream flex items-center justify-center text-brown-light hover:text-terracotta hover:bg-terracotta/10 transition-colors"
              title="Verven"
            >
              <Paintbrush size={15} />
            </button>
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
                <Icon size={18} className="shrink-0" />
                <span className="font-body font-semibold text-sm">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-warm">
          <p className="text-brown-light text-xs font-body text-center">gemaakt met liefde 🌿</p>
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
        <button
          onClick={() => setPanelOpen(true)}
          className="w-8 h-8 rounded-xl bg-cream flex items-center justify-center text-brown-light hover:text-terracotta transition-colors"
          title="Verven"
        >
          <Paintbrush size={15} />
        </button>
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
                <Icon size={20} className="shrink-0" />
                <span className="text-[9px] font-semibold leading-none whitespace-nowrap">{label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

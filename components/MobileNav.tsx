"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/themeContext";
import { getIcon } from "@/lib/iconMap";
import { Paintbrush, Heart } from "lucide-react";

export function MobileNavTop() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const { config, setPanelOpen } = useTheme();
  const brandName = config.pageTitle || "Jozzemiene";

  return (
    <div className="flex items-center justify-between mb-4 md:hidden">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/70 shadow-sm">
          <Heart className="fill-rose text-rose" size={16} />
        </div>
        <span className="font-display text-xl font-bold text-brown">{brandName}</span>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/feedback"
          className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/70 text-sm font-bold text-brown-light shadow-sm hover:text-terracotta transition-colors">
          !
        </Link>
        <button onClick={() => setPanelOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/70 text-brown-light shadow-sm hover:text-terracotta transition-colors">
          <Paintbrush size={15} />
        </button>
      </div>
    </div>
  );
}

export function MobileNavBottom() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const { config } = useTheme();

  return (
    <div className="mt-4 md:hidden">
      <div className="soft-panel rounded-[1.75rem] px-2 py-2 flex items-center overflow-x-auto gap-1.5" style={{ scrollbarWidth: "none" }}>
        {config.navItems.map(({ href, iconName, label }) => {
          const Icon = getIcon(iconName);
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className={`flex shrink-0 items-center gap-2 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all
                ${active
                  ? "bg-gradient-to-r from-terracotta to-[#d07c63] text-cream shadow-sm"
                  : "bg-white/50 text-brown hover:bg-white/80 hover:text-terracotta"}`}>
              <Icon size={16} className="shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

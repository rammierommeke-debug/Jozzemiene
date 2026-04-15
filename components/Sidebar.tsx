"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, PiggyBank, Lightbulb, UtensilsCrossed, Home, Heart, Image, Plane, Mail, CheckSquare } from "lucide-react";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/kalender", icon: Calendar, label: "Kalender" },
  { href: "/taken", icon: CheckSquare, label: "Taken" },
  { href: "/fotos", icon: Image, label: "Foto's" },
  { href: "/sparen", icon: PiggyBank, label: "Sparen" },
  { href: "/ideetjes", icon: Lightbulb, label: "Ideetjes" },
  { href: "/menu", icon: UtensilsCrossed, label: "Menu" },
  { href: "/reizen", icon: Plane, label: "Reizen" },
  { href: "/berichtjes", icon: Mail, label: "Lieve berichtjes" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-warm border-r border-warm flex flex-col shadow-sm">
      <div className="p-6 border-b border-warm">
        <div className="flex items-center gap-2 mb-1">
          <Heart className="text-rose fill-rose" size={20} />
          <span className="font-handwriting text-2xl text-brown">Jozzemiene</span>
        </div>
        <p className="text-brown-light text-xs font-body ml-7">want iemand moet dit bijhouden</p>
      </div>

      <nav className="flex-1 p-4 flex flex-col gap-1">
        {navItems.map(({ href, icon: Icon, label }) => {
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
  );
}

"use client";

import Link from "next/link";
import { Gamepad2 } from "lucide-react";

const games = [
  {
    href: "/spellen/manillen",
    icon: "🃏",
    label: "Manillen",
    desc: "Kaartspel voor 2 spelers — Emma vs Roel",
    color: "bg-sage-light",
  },
];

export default function SpellenPage() {
  return (
    <div className="max-w-2xl mx-auto pt-14 md:pt-0">
      <div className="flex items-center gap-3 mb-8">
        <Gamepad2 className="text-terracotta" size={28} />
        <h1 className="font-display text-3xl text-brown">Spellen</h1>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {games.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className={`${g.color} rounded-3xl p-6 flex flex-col gap-3 border border-warm hover:shadow-md transition-all duration-200 group hover:-translate-y-0.5`}
          >
            <span className="text-4xl">{g.icon}</span>
            <div>
              <p className="font-display text-xl text-brown">{g.label}</p>
              <p className="text-sm text-brown-light">{g.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

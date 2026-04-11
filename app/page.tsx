import { Heart, Sun, Calendar, Image, PiggyBank, Lightbulb, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

const quickLinks = [
  {
    href: "/kalender",
    icon: Calendar,
    label: "Kalender",
    desc: "Komende afspraken & plannen",
    color: "bg-sage-light",
    iconColor: "text-sage",
  },
  {
    href: "/fotos",
    icon: Image,
    label: "Foto's",
    desc: "Onze gedeelde herinneringen",
    color: "bg-rose-light",
    iconColor: "text-rose",
  },
  {
    href: "/sparen",
    icon: PiggyBank,
    label: "Sparen",
    desc: "Onze spaardoelen",
    color: "bg-warm",
    iconColor: "text-brown-light",
  },
  {
    href: "/ideetjes",
    icon: Lightbulb,
    label: "Ideetjes",
    desc: "Dingen die we willen doen",
    color: "bg-terracotta-light/30",
    iconColor: "text-terracotta",
  },
  {
    href: "/menu",
    icon: UtensilsCrossed,
    label: "Menu",
    desc: "Het menu van deze week",
    color: "bg-sage-light/40",
    iconColor: "text-sage",
  },
];

export default function HomePage() {
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 6 ? "Goeienacht" : hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";

  const dateStr = now.toLocaleDateString("nl-NL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Sun className="text-terracotta" size={28} />
          <h1 className="font-display text-4xl text-brown">
            {greeting}, mensen
          </h1>
          <Heart className="text-rose fill-rose" size={24} />
        </div>
        <p className="font-handwriting text-xl text-brown-light ml-1 capitalize">{dateStr}</p>
        <div className="mt-4 p-4 bg-warm rounded-3xl border border-warm/80">
          <p className="font-handwriting text-lg text-brown text-center">
            "Samen sterk. Maar ook prima apart. 🤝"
          </p>
        </div>
      </div>

      <h2 className="font-display text-2xl text-brown mb-4">Wat wil je doen?</h2>
      <div className="grid grid-cols-2 gap-4">
        {quickLinks.map(({ href, icon: Icon, label, desc, color, iconColor }) => (
          <Link
            key={href}
            href={href}
            className={`${color} rounded-3xl p-6 flex flex-col gap-3 border border-warm hover:shadow-md transition-all duration-200 group hover:-translate-y-0.5`}
          >
            <div className={`${iconColor} group-hover:scale-110 transition-transform duration-200`}>
              <Icon size={28} />
            </div>
            <div>
              <p className="font-display text-lg text-brown">{label}</p>
              <p className="text-sm text-brown-light">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}

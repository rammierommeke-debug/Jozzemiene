"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { useTheme } from "@/lib/themeContext";
import { getIcon } from "@/lib/iconMap";

export default function CustomPage() {
  const { slug } = useParams<{ slug: string }>();
  const { config } = useTheme();
  const href = `/custom/${slug}`;
  const navItem = config.navItems.find(i => i.href === href);
  const label = navItem?.label || slug;
  const IconComp = getIcon(navItem?.iconName || "Star");

  const storageKey = `jozzemiene-custom-${slug}`;
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setContent(saved);
  }, [storageKey]);

  function startEdit() {
    setDraft(content);
    setEditing(true);
  }

  function save() {
    setContent(draft);
    localStorage.setItem(storageKey, draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(content);
    setEditing(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-warm flex items-center justify-center">
          <IconComp size={24} className="text-terracotta" />
        </div>
        <div>
          <h1 className="font-display text-3xl text-brown">{label}</h1>
          <p className="text-brown-light text-sm">Aangepaste pagina</p>
        </div>
      </div>

      <div className="bg-warm rounded-3xl p-6">
        {editing ? (
          <div className="flex flex-col gap-3">
            <textarea
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={`Schrijf hier iets over ${label}...`}
              rows={12}
              className="w-full bg-cream rounded-2xl p-4 text-brown text-sm leading-relaxed resize-none border border-warm focus:outline-none focus:border-terracotta"
            />
            <div className="flex gap-2">
              <button
                onClick={save}
                className="flex items-center gap-2 bg-terracotta text-cream px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-terracotta/80 transition-colors"
              >
                <Check size={14} />
                Opslaan
              </button>
              <button
                onClick={cancel}
                className="flex items-center gap-2 text-brown-light hover:text-rose px-4 py-2.5 rounded-xl text-sm transition-colors"
              >
                <X size={14} />
                Annuleren
              </button>
            </div>
          </div>
        ) : (
          <div>
            {content ? (
              <div className="text-brown text-sm leading-relaxed whitespace-pre-wrap mb-4">{content}</div>
            ) : (
              <p className="text-brown-light text-sm italic mb-4">
                Deze pagina is nog leeg. Klik op bewerken om iets toe te voegen!
              </p>
            )}
            <button
              onClick={startEdit}
              className="flex items-center gap-2 text-brown-light hover:text-terracotta transition-colors text-sm"
            >
              <Pencil size={14} />
              Bewerken
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { X, RotateCcw, Plus, Trash2, ChevronDown, ChevronUp, Paintbrush, GripVertical } from "lucide-react";
import { useTheme, DEFAULT_NAV, PRESET_THEMES, ThemeColors, NavItem } from "@/lib/themeContext";
import { ICON_MAP, ICON_NAMES, getIcon } from "@/lib/iconMap";

const COLOR_LABELS: { key: keyof ThemeColors; label: string; description: string }[] = [
  { key: "cream", label: "Achtergrond", description: "Hoofdachtergrond van de pagina" },
  { key: "warm", label: "Zijbalk & kaarten", description: "Sidebar, kaarten en vlakken" },
  { key: "terracotta", label: "Primaire kleur", description: "Knoppen, actieve links" },
  { key: "rose", label: "Accent", description: "Hartje en highlights" },
  { key: "sage", label: "Secundair accent", description: "Extra accenten" },
  { key: "brown", label: "Tekst", description: "Hoofdtekst" },
  { key: "brown-light", label: "Subtiele tekst", description: "Labels en beschrijvingen" },
];

export default function VervenPanel() {
  const { config, setColors, setNavItems, setTexts, resetColors, panelOpen, setPanelOpen } = useTheme();
  const [tab, setTab] = useState<"kleuren" | "navigatie" | "tekst">("kleuren");
  const [editingNav, setEditingNav] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState("Star");
  const [newPageType, setNewPageType] = useState("tekst");
  const [showAddForm, setShowAddForm] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragItem = useRef<string | null>(null);
  const [pageTitle, setPageTitle] = useState(config.pageTitle || "Jozzemiene");
  const [tagline, setTagline] = useState(config.tagline || "built to remember");

  if (!panelOpen) return null;

  function updateColor(key: keyof ThemeColors, value: string) {
    setColors({ ...config.colors, [key]: value });
  }

  function updateNavItem(href: string, changes: Partial<NavItem>) {
    setNavItems(config.navItems.map(item =>
      item.href === href ? { ...item, ...changes } : item
    ));
  }

  function removeNavItem(href: string) {
    setNavItems(config.navItems.filter(item => item.href !== href));
  }

  const PAGE_TYPES = [
    { value: "tekst",     emoji: "📝", label: "Tekst",      desc: "Vrije aantekeningen" },
    { value: "blog",      emoji: "✍️",  label: "Blog",       desc: "Posts met titel & datum" },
    { value: "dagboek",   emoji: "📖", label: "Dagboek",    desc: "Dagelijkse entries" },
    { value: "agenda",    emoji: "📅", label: "Agenda",     desc: "Afspraken bijhouden" },
    { value: "training",  emoji: "🏃", label: "Training",   desc: "Sport & loopschema" },
    { value: "checklist", emoji: "✅", label: "Checklist",  desc: "Afvinklijstje" },
  ];

  function addCustomSection() {
    if (!newLabel.trim()) return;
    const slug = newLabel.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const href = `/custom/${slug}`;
    if (config.navItems.some(i => i.href === href)) return;
    setNavItems([...config.navItems, { href, iconName: newIcon, label: newLabel.trim(), isCustom: true, pageType: newPageType }]);
    setNewLabel("");
    setNewIcon("Star");
    setNewPageType("tekst");
    setShowAddForm(false);
  }

  function resetNav() {
    setNavItems(DEFAULT_NAV);
  }

  function handleDragStart(href: string) {
    dragItem.current = href;
  }

  function handleDragOver(e: React.DragEvent, href: string) {
    e.preventDefault();
    setDragOver(href);
  }

  function handleDrop(targetHref: string) {
    if (!dragItem.current || dragItem.current === targetHref) {
      setDragOver(null);
      return;
    }
    const items = [...config.navItems];
    const fromIdx = items.findIndex(i => i.href === dragItem.current);
    const toIdx = items.findIndex(i => i.href === targetHref);
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    setNavItems(items);
    dragItem.current = null;
    setDragOver(null);
  }

  const NewIconComp = getIcon(newIcon);

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setPanelOpen(false)} />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-screen w-full max-w-[95vw] p-2 sm:w-96 sm:p-3">
        <div className="soft-panel flex h-full flex-col overflow-hidden rounded-[2rem] border-white/60 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/50">
          <div className="flex items-center gap-2">
            <Paintbrush size={20} className="text-terracotta" />
            <h2 className="font-display text-xl text-brown">Verven</h2>
          </div>
          <button onClick={() => setPanelOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/70 text-brown-light shadow-sm transition-colors hover:text-rose">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/50 px-3 pt-3">
          {(["kleuren", "navigatie", "tekst"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-t-2xl px-3 py-3 text-sm font-semibold capitalize transition-colors ${
                tab === t ? "bg-white/70 text-terracotta shadow-sm" : "text-brown-light hover:text-brown"
              }`}
            >
              {t === "kleuren" ? "🎨 Kleuren" : t === "navigatie" ? "🧭 Navigatie" : "✏️ Tekst"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

          {/* KLEUREN TAB */}
          {tab === "kleuren" && (
            <>
              {/* Presets */}
              <div>
                <p className="text-xs font-semibold text-brown-light uppercase tracking-wide mb-3">Thema's</p>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_THEMES.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => setColors(preset.colors)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 border-warm hover:border-terracotta transition-colors"
                      style={{ background: preset.colors.warm }}
                    >
                      <span className="text-xl">{preset.emoji}</span>
                      <span className="text-[10px] font-semibold leading-tight text-center" style={{ color: preset.colors.brown }}>
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual color pickers */}
              <div>
                <p className="text-xs font-semibold text-brown-light uppercase tracking-wide mb-3">Kleuren aanpassen</p>
                <div className="flex flex-col gap-3">
                  {COLOR_LABELS.map(({ key, label, description }) => (
                    <div key={key} className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/55 p-3">
                      <div className="relative shrink-0">
                        <div
                          className="w-10 h-10 rounded-xl border-2 border-white shadow-sm cursor-pointer"
                          style={{ background: config.colors[key] }}
                        />
                        <input
                          type="color"
                          value={config.colors[key]}
                          onChange={e => updateColor(key, e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-brown">{label}</p>
                        <p className="text-xs text-brown-light truncate">{description}</p>
                      </div>
                      <span className="text-xs text-brown-light font-mono">{config.colors[key]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={resetColors}
                className="flex items-center gap-2 text-sm text-brown-light hover:text-rose transition-colors justify-center py-2"
              >
                <RotateCcw size={14} />
                Standaard kleuren herstellen
              </button>
            </>
          )}

          {/* NAVIGATIE TAB */}
          {tab === "navigatie" && (
            <>
              <div>
                <p className="text-xs font-semibold text-brown-light uppercase tracking-wide mb-3">Navigatie aanpassen</p>
                <div className="flex flex-col gap-2">
                  {config.navItems.map(item => {
                    const IconComp = getIcon(item.iconName);
                    const isEditing = editingNav === item.href;
                    return (
                      <div
                        key={item.href}
                        draggable
                        onDragStart={() => handleDragStart(item.href)}
                        onDragOver={e => handleDragOver(e, item.href)}
                        onDrop={() => handleDrop(item.href)}
                        onDragEnd={() => setDragOver(null)}
                        className={`overflow-hidden rounded-2xl border border-white/60 bg-white/55 transition-all ${dragOver === item.href ? "ring-2 ring-terracotta opacity-80" : ""}`}
                      >
                        <div className="flex items-center gap-3 p-3">
                          <GripVertical size={14} className="text-brown-light/50 cursor-grab shrink-0" />
                          {/* Icon */}
                          <div
                            className="w-9 h-9 rounded-xl bg-cream flex items-center justify-center cursor-pointer hover:bg-terracotta hover:text-cream transition-colors shrink-0"
                            onClick={() => setShowIconPicker(showIconPicker === item.href ? null : item.href)}
                          >
                            <IconComp size={16} className="text-terracotta" />
                          </div>
                          {/* Label */}
                          {isEditing ? (
                            <input
                              autoFocus
                              value={item.label}
                              onChange={e => updateNavItem(item.href, { label: e.target.value })}
                              onBlur={() => setEditingNav(null)}
                              onKeyDown={e => e.key === "Enter" && setEditingNav(null)}
                              className="flex-1 bg-cream rounded-xl px-3 py-1.5 text-sm text-brown border border-terracotta focus:outline-none"
                            />
                          ) : (
                            <span
                              className="flex-1 text-sm font-semibold text-brown cursor-pointer hover:text-terracotta"
                              onClick={() => setEditingNav(item.href)}
                            >
                              {item.label}
                            </span>
                          )}
                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setEditingNav(isEditing ? null : item.href)}
                              className="text-brown-light hover:text-terracotta transition-colors p-1"
                            >
                              {isEditing ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {item.isCustom && (
                              <button
                                onClick={() => removeNavItem(item.href)}
                                className="text-brown-light hover:text-rose transition-colors p-1"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Icon picker */}
                        {showIconPicker === item.href && (
                          <div className="border-t border-warm p-3">
                            <p className="text-xs text-brown-light mb-2">Kies een icoontje:</p>
                            <div className="grid grid-cols-8 gap-1 max-h-36 overflow-y-auto">
                              {ICON_NAMES.map(name => {
                                const Ic = ICON_MAP[name];
                                return (
                                  <button
                                    key={name}
                                    onClick={() => {
                                      updateNavItem(item.href, { iconName: name });
                                      setShowIconPicker(null);
                                    }}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                      item.iconName === name ? "bg-terracotta text-cream" : "hover:bg-cream text-brown"
                                    }`}
                                    title={name}
                                  >
                                    <Ic size={14} />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add custom section */}
              <div>
                {showAddForm ? (
                  <div className="rounded-2xl border border-white/60 bg-white/55 p-4 flex flex-col gap-3">
                    <p className="text-sm font-semibold text-brown">Nieuwe rubriek</p>
                    <input
                      autoFocus
                      placeholder="Naam (bv. Recepten)"
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addCustomSection()}
                      className="bg-cream rounded-xl px-3 py-2 text-sm text-brown border border-warm focus:outline-none focus:border-terracotta"
                    />
                    <div>
                      <p className="text-xs text-brown-light mb-2">Type pagina:</p>
                      <div className="grid grid-cols-2 gap-1.5 mb-3">
                        {PAGE_TYPES.map(pt => (
                          <button
                            key={pt.value}
                            onClick={() => setNewPageType(pt.value)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors border ${newPageType === pt.value ? "bg-terracotta text-cream border-terracotta" : "bg-cream text-brown border-warm hover:border-terracotta"}`}
                          >
                            <span className="text-base">{pt.emoji}</span>
                            <div>
                              <p className="text-xs font-semibold leading-none">{pt.label}</p>
                              <p className={`text-[10px] leading-none mt-0.5 ${newPageType === pt.value ? "text-cream/70" : "text-brown-light"}`}>{pt.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-brown-light mb-2">Icoontje:</p>
                      <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto">
                        {ICON_NAMES.map(name => {
                          const Ic = ICON_MAP[name];
                          return (
                            <button
                              key={name}
                              onClick={() => setNewIcon(name)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                newIcon === name ? "bg-terracotta text-cream" : "hover:bg-cream text-brown"
                              }`}
                            >
                              <Ic size={14} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addCustomSection}
                        disabled={!newLabel.trim()}
                        className="flex-1 bg-terracotta text-cream rounded-xl py-2 text-sm font-semibold hover:bg-terracotta/80 transition-colors disabled:opacity-40"
                      >
                        Toevoegen
                      </button>
                      <button
                        onClick={() => { setShowAddForm(false); setNewLabel(""); }}
                        className="px-4 text-brown-light hover:text-rose transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    {newLabel.trim() && (
                      <div className="flex items-center gap-2 text-xs text-brown-light bg-cream rounded-xl px-3 py-2">
                        <NewIconComp size={12} />
                        <span>Pagina: /custom/{newLabel.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full flex items-center gap-2 justify-center py-3 rounded-2xl border-2 border-dashed border-warm hover:border-terracotta text-brown-light hover:text-terracotta transition-colors text-sm font-semibold"
                  >
                    <Plus size={16} />
                    Nieuwe rubriek toevoegen
                  </button>
                )}
              </div>

              <button
                onClick={resetNav}
                className="flex items-center gap-2 text-sm text-brown-light hover:text-rose transition-colors justify-center py-2"
              >
                <RotateCcw size={14} />
                Standaard navigatie herstellen
              </button>
            </>
          )}
          {/* TEKST TAB */}
          {tab === "tekst" && (
            <>
              <div>
                <p className="text-xs font-semibold text-brown-light uppercase tracking-wide mb-3">Paginatekst aanpassen</p>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-brown">Naam bovenaan</label>
                    <input
                      value={pageTitle}
                      onChange={e => setPageTitle(e.target.value)}
                      className="bg-warm rounded-xl px-3 py-2 text-sm text-brown border border-warm focus:outline-none focus:border-terracotta font-handwriting text-xl"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-brown">Ondertitel</label>
                    <input
                      value={tagline}
                      onChange={e => setTagline(e.target.value)}
                      className="bg-warm rounded-xl px-3 py-2 text-sm text-brown border border-warm focus:outline-none focus:border-terracotta"
                    />
                  </div>
                  <button
                    onClick={() => setTexts(pageTitle, tagline)}
                    className="bg-terracotta text-cream rounded-xl py-2 text-sm font-semibold hover:bg-terracotta/80 transition-colors"
                  >
                    Opslaan
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </>
  );
}

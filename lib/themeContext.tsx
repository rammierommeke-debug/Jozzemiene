"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeColors = {
  cream: string;
  warm: string;
  terracotta: string;
  "terracotta-light": string;
  sage: string;
  "sage-light": string;
  rose: string;
  "rose-light": string;
  brown: string;
  "brown-light": string;
};

export type NavItem = {
  href: string;
  iconName: string;
  label: string;
  isCustom?: boolean;
};

export type ThemeConfig = {
  colors: ThemeColors;
  navItems: NavItem[];
};

export const DEFAULT_COLORS: ThemeColors = {
  cream: "#fdf6ec",
  warm: "#f5e6d0",
  terracotta: "#c2714f",
  "terracotta-light": "#d9896a",
  sage: "#7a9e7e",
  "sage-light": "#a8c4aa",
  rose: "#d4848a",
  "rose-light": "#e8b4b8",
  brown: "#6b4c3b",
  "brown-light": "#9a7060",
};

export const DEFAULT_NAV: NavItem[] = [
  { href: "/", iconName: "Home", label: "Home" },
  { href: "/kalender", iconName: "Calendar", label: "Kalender" },
  { href: "/taken", iconName: "CheckSquare", label: "Taken" },
  { href: "/fotos", iconName: "Image", label: "Foto's" },
  { href: "/sparen", iconName: "PiggyBank", label: "Sparen" },
  { href: "/ideetjes", iconName: "Lightbulb", label: "Ideetjes" },
  { href: "/bucketlist", iconName: "Star", label: "Bucket List" },
  { href: "/menu", iconName: "UtensilsCrossed", label: "Menu" },
  { href: "/reizen", iconName: "Plane", label: "Reizen" },
  { href: "/berichtjes", iconName: "Mail", label: "Lieve berichtjes" },
];

export const PRESET_THEMES: { name: string; emoji: string; colors: ThemeColors }[] = [
  {
    name: "Warm Terracotta",
    emoji: "🍂",
    colors: DEFAULT_COLORS,
  },
  {
    name: "Ocean Blue",
    emoji: "🌊",
    colors: {
      cream: "#eff6ff",
      warm: "#dbeafe",
      terracotta: "#2563eb",
      "terracotta-light": "#3b82f6",
      sage: "#0891b2",
      "sage-light": "#67e8f9",
      rose: "#818cf8",
      "rose-light": "#c7d2fe",
      brown: "#1e3a5f",
      "brown-light": "#3b6ea5",
    },
  },
  {
    name: "Forest Green",
    emoji: "🌿",
    colors: {
      cream: "#f0fdf4",
      warm: "#dcfce7",
      terracotta: "#16a34a",
      "terracotta-light": "#22c55e",
      sage: "#065f46",
      "sage-light": "#6ee7b7",
      rose: "#84cc16",
      "rose-light": "#d9f99d",
      brown: "#14532d",
      "brown-light": "#166534",
    },
  },
  {
    name: "Lavender",
    emoji: "💜",
    colors: {
      cream: "#faf5ff",
      warm: "#ede9fe",
      terracotta: "#7c3aed",
      "terracotta-light": "#8b5cf6",
      sage: "#6d28d9",
      "sage-light": "#ddd6fe",
      rose: "#ec4899",
      "rose-light": "#fbcfe8",
      brown: "#4c1d95",
      "brown-light": "#6d28d9",
    },
  },
  {
    name: "Rose Pink",
    emoji: "🌸",
    colors: {
      cream: "#fff1f2",
      warm: "#ffe4e6",
      terracotta: "#e11d48",
      "terracotta-light": "#f43f5e",
      sage: "#be185d",
      "sage-light": "#fbcfe8",
      rose: "#f97316",
      "rose-light": "#fed7aa",
      brown: "#881337",
      "brown-light": "#9f1239",
    },
  },
  {
    name: "Dark Mode",
    emoji: "🌙",
    colors: {
      cream: "#1c1917",
      warm: "#292524",
      terracotta: "#f97316",
      "terracotta-light": "#fb923c",
      sage: "#22d3ee",
      "sage-light": "#164e63",
      rose: "#f43f5e",
      "rose-light": "#4c0519",
      brown: "#e7e5e4",
      "brown-light": "#a8a29e",
    },
  },
];

type ThemeContextType = {
  config: ThemeConfig;
  setColors: (colors: ThemeColors) => void;
  setNavItems: (items: NavItem[]) => void;
  resetColors: () => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ThemeConfig>({
    colors: DEFAULT_COLORS,
    navItems: DEFAULT_NAV,
  });
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("jozzemiene-theme");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig({
          colors: { ...DEFAULT_COLORS, ...parsed.colors },
          navItems: parsed.navItems || DEFAULT_NAV,
        });
      } catch {}
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(config.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
  }, [config.colors]);

  function setColors(colors: ThemeColors) {
    const next = { ...config, colors };
    setConfig(next);
    localStorage.setItem("jozzemiene-theme", JSON.stringify(next));
  }

  function setNavItems(navItems: NavItem[]) {
    const next = { ...config, navItems };
    setConfig(next);
    localStorage.setItem("jozzemiene-theme", JSON.stringify(next));
  }

  function resetColors() {
    setColors(DEFAULT_COLORS);
  }

  return (
    <ThemeContext.Provider value={{ config, setColors, setNavItems, resetColors, panelOpen, setPanelOpen }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

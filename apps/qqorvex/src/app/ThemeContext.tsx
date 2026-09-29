import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppTheme = "dark" | "light";
export type AppSkin = "default" | "aurora" | "sakura" | "solstice" | "nebula" | "eclipse" | "vip";

const STORAGE_KEY = "qqorvex.theme";
export const APP_SKIN_STORAGE_KEY = "qqorvex.skin";

export const LEVEL_THEMES = [
  {
    id: "aurora",
    level: 10,
    name: "Aurora Boreal",
    essence: "Clareza em movimento",
    description: "Verde-jade e turquesa sobre uma noite de floresta.",
    preview: { canvas: "#071613", panel: "#15352c", accent: "#54d6a5", glow: "#a7f3d0" },
  },
  {
    id: "sakura",
    level: 20,
    name: "Sakura",
    essence: "Leveza para florescer",
    description: "Rosa-cereja e ameixa para uma atmosfera acolhedora.",
    preview: { canvas: "#180f18", panel: "#382238", accent: "#ff7eab", glow: "#ffc0d5" },
  },
  {
    id: "solstice",
    level: 30,
    name: "Solstício",
    essence: "Energia que ilumina",
    description: "Âmbar e dourado em tons quentes de fim de tarde.",
    preview: { canvas: "#18120a", panel: "#382a18", accent: "#f1b64a", glow: "#ffdc91" },
  },
  {
    id: "nebula",
    level: 40,
    name: "Nebulosa",
    essence: "Ideias sem fronteiras",
    description: "Índigo e lavanda inspirados no céu profundo.",
    preview: { canvas: "#100e20", panel: "#2a2746", accent: "#a99aff", glow: "#d0c8ff" },
  },
  {
    id: "eclipse",
    level: 50,
    name: "Eclipse",
    essence: "Domínio da jornada",
    description: "Azul glacial e aço sobre um horizonte de obsidiana.",
    preview: { canvas: "#10151d", panel: "#27364a", accent: "#65c9ea", glow: "#b9edff" },
  },
] as const;

export const VIP_THEME = {
  id: "vip",
  name: "Coroa Vex",
  essence: "Seu Plus, seu espaço de destaque",
  description: "Obsidiana com ametista elétrica e detalhes de ouro champagne.",
  preview: { canvas: "#100d19", panel: "#282139", accent: "#a878f5", glow: "#f0cc77" },
} as const;

export function isAppSkin(value: unknown): value is AppSkin {
  return value === "default" || value === VIP_THEME.id || LEVEL_THEMES.some((theme) => theme.id === value);
}

function readSavedTheme(): AppTheme {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    theme === "dark" ? "#171717" : "#f8f6f3",
  );
}

function readSavedSkin(): AppSkin {
  try {
    const saved = window.localStorage.getItem(APP_SKIN_STORAGE_KEY);
    return isAppSkin(saved) ? saved : "default";
  } catch {
    return "default";
  }
}

function applySkin(skin: AppSkin) {
  document.documentElement.dataset.skin = skin;
}

const initialTheme = readSavedTheme();
const initialSkin = readSavedSkin();
if (typeof document !== "undefined") {
  applyTheme(initialTheme);
  applySkin(initialSkin);
}

const ThemeContext = createContext<{
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  skin: AppSkin;
  setSkin: (skin: AppSkin) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>(initialTheme);
  const [skin, setSkin] = useState<AppSkin>(initialSkin);

  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // A escolha continua funcionando nesta sessão se o armazenamento estiver indisponível.
    }
  }, [theme]);

  useEffect(() => {
    applySkin(skin);
    try {
      window.localStorage.setItem(APP_SKIN_STORAGE_KEY, skin);
    } catch {
      // A escolha continua valendo até o fim desta sessão sem armazenamento local.
    }
  }, [skin]);

  useEffect(() => {
    function syncTheme(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setTheme(event.newValue === "light" ? "light" : "dark");
      if (event.key === APP_SKIN_STORAGE_KEY) setSkin(isAppSkin(event.newValue) ? event.newValue : "default");
    }
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  const value = useMemo(() => ({
    theme,
    setTheme,
    toggleTheme: () => setTheme((current) => current === "dark" ? "light" : "dark"),
    skin,
    setSkin,
  }), [theme, skin]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}

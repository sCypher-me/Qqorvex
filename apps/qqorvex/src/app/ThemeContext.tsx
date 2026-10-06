import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppTheme = "dark" | "light";
/** Preferência salva: um tema fixo ou acompanhar o sistema operacional. */
export type ThemePreference = AppTheme | "system";
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
  essence: "Obsidiana profunda, ouro champanhe e a energia ametista da Vex",
  description: "Uma edição Plus de alto contraste: superfícies de obsidiana com reflexos ameixa, metais champanhe e a Vex em ametista.",
  preview: { canvas: "#09080a", panel: "#141216", accent: "#c5a467", glow: "#b995e9" },
} as const;

export function isAppSkin(value: unknown): value is AppSkin {
  return value === "default" || value === VIP_THEME.id || LEVEL_THEMES.some((theme) => theme.id === value);
}

function readSavedPreference(): ThemePreference {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "system" ? saved : "dark";
  } catch {
    return "dark";
  }
}

function systemTheme(): AppTheme {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function resolveTheme(preference: ThemePreference): AppTheme {
  return preference === "system" ? systemTheme() : preference;
}

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#100f0e" : "#f6f2ea");
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

const initialPreference = readSavedPreference();
const initialSkin = readSavedSkin();
if (typeof document !== "undefined") {
  applyTheme(resolveTheme(initialPreference));
  applySkin(initialSkin);
}

const ThemeContext = createContext<{
  /** Tema efetivo na tela agora. */
  theme: AppTheme;
  /** Escolha salva (inclui "system"). */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** Fixa um tema (sai do modo automático). */
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  skin: AppSkin;
  setSkin: (skin: AppSkin) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);
  const [system, setSystem] = useState<AppTheme>(systemTheme);
  const [skin, setSkin] = useState<AppSkin>(initialSkin);
  const theme: AppTheme = preference === "system" ? system : preference;

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: light)");
    if (!media) return;
    const onChange = () => setSystem(media.matches ? "light" : "dark");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => applyTheme(theme), [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // A escolha continua funcionando nesta sessão se o armazenamento estiver indisponível.
    }
  }, [preference]);

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
      if (event.key === STORAGE_KEY) setPreference(event.newValue === "light" || event.newValue === "system" ? event.newValue : "dark");
      if (event.key === APP_SKIN_STORAGE_KEY) setSkin(isAppSkin(event.newValue) ? event.newValue : "default");
    }
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  const value = useMemo(() => ({
    theme,
    preference,
    setPreference,
    setTheme: (next: AppTheme) => setPreference(next),
    toggleTheme: () => setPreference(theme === "dark" ? "light" : "dark"),
    skin,
    setSkin,
  }), [theme, preference, skin]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}

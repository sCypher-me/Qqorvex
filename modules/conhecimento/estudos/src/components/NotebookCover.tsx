import type { NotebookCoverTheme } from "../types";

export const NOTEBOOK_COVER_THEMES: Array<{ id: NotebookCoverTheme; label: string; background: string; accent: string; foreground: string }> = [
  { id: "gold", label: "Âmbar", background: "#32271b", accent: "#e5b15f", foreground: "#fff5e5" },
  { id: "forest", label: "Floresta", background: "#1c3027", accent: "#a5d6b3", foreground: "#effff2" },
  { id: "ocean", label: "Oceano", background: "#1c303b", accent: "#91d4e5", foreground: "#effaff" },
  { id: "plum", label: "Ametista", background: "#30243a", accent: "#d5a6ec", foreground: "#fff4ff" },
  { id: "rose", label: "Rosa", background: "#3a252c", accent: "#f0a9ba", foreground: "#fff3f5" },
  { id: "midnight", label: "Meia-noite", background: "#202638", accent: "#a7baff", foreground: "#f3f5ff" },
];

export const NOTEBOOK_COVER_STICKERS = ["✨", "🌱", "🌙", "⭐", "🪐", "🌸", "☁️", "📚", "🦋", "🍀", "💡", "🎯"];

export function notebookCoverTheme(theme: string) {
  return NOTEBOOK_COVER_THEMES.find((item) => item.id === theme) ?? NOTEBOOK_COVER_THEMES[0]!;
}

export function NotebookCoverArtwork({
  title,
  subtitle,
  theme,
  stickers = [],
  imageUrl,
  className = "",
}: {
  title: string;
  subtitle?: string | null;
  theme: string;
  stickers?: string[];
  imageUrl?: string | null;
  className?: string;
}) {
  const palette = notebookCoverTheme(theme);
  return (
    <div
      className={`relative isolate flex min-h-[168px] flex-col justify-between overflow-hidden rounded-xl border border-white/10 px-5 py-4 shadow-inner ${className}`}
      style={{
        color: palette.foreground,
        backgroundColor: palette.background,
        backgroundImage: imageUrl
          ? `linear-gradient(180deg, color-mix(in srgb, ${palette.background} 24%, transparent), color-mix(in srgb, ${palette.background} 94%, transparent)), url("${imageUrl}")`
          : `radial-gradient(ellipse at 82% 14%, color-mix(in srgb, ${palette.accent} 30%, transparent), transparent 38%), linear-gradient(145deg, ${palette.background}, color-mix(in srgb, ${palette.background} 72%, #090909))`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 -z-10 w-2 border-r border-white/10" style={{ backgroundColor: palette.accent, opacity: 0.6 }} />
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full border border-white/15 bg-black/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.16em] text-white/75">CADERNO</span>
        <div className="flex max-w-[45%] flex-wrap justify-end gap-1.5" aria-label="Adesivos da capa">
          {stickers.slice(0, 4).map((sticker, index) => <span key={`${sticker}-${index}`} className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/20 text-lg shadow-sm">{sticker}</span>)}
        </div>
      </div>
      <div className="relative z-0 max-w-[88%]">
        <span aria-hidden="true" className="mb-2 block h-1 w-10 rounded-full" style={{ backgroundColor: palette.accent }} />
        <h3 className="line-clamp-2 font-display text-[21px] font-semibold leading-tight tracking-[-.025em] drop-shadow-sm">{title || "Novo caderno"}</h3>
        {subtitle && <p className="mt-1.5 line-clamp-1 text-xs font-medium text-white/70">{subtitle}</p>}
      </div>
    </div>
  );
}

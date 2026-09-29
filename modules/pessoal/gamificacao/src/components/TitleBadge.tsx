type TitleTheme = "owner" | "subscription" | "pioneer" | "productive" | "consistent" | "scholar" | "reader" | "level" | "default";

function getTheme(title: string): TitleTheme {
  const normalized = title.toLocaleLowerCase("pt-BR");
  if (normalized === "dono") return "owner";
  if (/assinante|anual|lifetime|vip/.test(normalized)) return "subscription";
  if (/pioneiro|beta/.test(normalized)) return "pioneer";
  if (/produtivo/.test(normalized)) return "productive";
  if (/consistente/.test(normalized)) return "consistent";
  if (/estudioso|mestre|dedicado/.test(normalized)) return "scholar";
  if (/leitor/.test(normalized)) return "reader";
  if (/iniciante|nível/.test(normalized)) return "level";
  return "default";
}

function TitleMark({ theme }: { theme: TitleTheme }) {
  if (theme === "owner" || theme === "subscription" || theme === "pioneer") {
    return <svg viewBox="0 0 20 20" className="h-[1em] w-[1em] shrink-0" fill="none" aria-hidden="true"><path d="m3 7 4 3 3-6 3 6 4-3-1.5 9h-11L3 7Z" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" /><path d="M5 13h10M6 16h8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.3" /><circle cx="3" cy="6" r="1" fill="currentColor" /><circle cx="10" cy="3" r="1" fill="currentColor" /><circle cx="17" cy="6" r="1" fill="currentColor" /></svg>;
  }
  if (theme === "productive") return <svg viewBox="0 0 20 20" className="h-[1em] w-[1em] shrink-0" fill="none" aria-hidden="true"><path d="m4 10 4 4 8-9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><circle cx="10" cy="10" r="8" stroke="currentColor" strokeOpacity=".65" strokeWidth="1.2" /></svg>;
  if (theme === "consistent") return <svg viewBox="0 0 20 20" className="h-[1em] w-[1em] shrink-0" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" /><path d="M10 5v5l3 2M5 2.5 3.5 4M15 2.5 16.5 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" /></svg>;
  if (theme === "scholar" || theme === "reader") return <svg viewBox="0 0 20 20" className="h-[1em] w-[1em] shrink-0" fill="none" aria-hidden="true"><path d="M10 6.5c-2.2-1.7-4.7-2.1-7-1.8v10c2.3-.3 4.8.1 7 1.8 2.2-1.7 4.7-2.1 7-1.8v-10c-2.3-.3-4.8.1-7 1.8Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" /><path d="M10 6.5v10M5.5 8c1.2 0 2.3.3 3.2.8m5.8-.8c-1.2 0-2.3.3-3.2.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.1" /></svg>;
  return <svg viewBox="0 0 20 20" className="h-[1em] w-[1em] shrink-0" fill="none" aria-hidden="true"><path d="m10 2 2 5.2 5.5.4-4.2 3.5 1.4 5.3-4.7-2.9-4.7 2.9 1.4-5.3-4.2-3.5 5.5-.4L10 2Z" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.25" /></svg>;
}

const THEME_CLASS: Record<TitleTheme, string> = {
  owner: "border-gold-line bg-gold-soft text-gold-fg [font-variant:small-caps] tracking-[.08em]",
  subscription: "border-ai-line bg-ai-soft text-ai-fg",
  pioneer: "border-gold-line bg-gold-soft text-gold-fg italic",
  productive: "border-danger/35 bg-danger-soft text-danger",
  consistent: "border-success/35 bg-success-soft text-success",
  scholar: "border-info/35 bg-info-soft text-info italic",
  reader: "border-warning/35 bg-warning-soft text-warning italic",
  level: "border-gold-line bg-gold-soft text-gold-fg",
  default: "border-line bg-hover text-fg-2",
};

const SIZE_CLASS = {
  sm: "gap-1 px-2 py-0.5 text-[10.5px]",
  md: "gap-1.5 px-2.5 py-1 text-xs",
  lg: "gap-2 px-3 py-1.5 text-sm",
} as const;

/** Título em destaque do perfil: cor por família de conquista, legível no tema claro e no escuro. */
export function TitleBadge({ title, size = "md", className = "" }: { title: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const theme = getTheme(title);
  return (
    <span className={`inline-flex w-fit max-w-full items-center rounded-full border font-semibold leading-tight whitespace-nowrap ${THEME_CLASS[theme]} ${SIZE_CLASS[size]} ${className}`} title={title}>
      <TitleMark theme={theme} />
      <span className="min-w-0 truncate">{title}</span>
    </span>
  );
}

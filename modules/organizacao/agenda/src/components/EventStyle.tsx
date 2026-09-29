import type { ReactNode } from "react";
import type { CalendarEvent } from "../types";

/**
 * Apresentação dos eventos no Design System v1.0: fundo tintado + borda esquerda colorida +
 * pílula com a categoria (o mock da Agenda faz isso explicitamente). Mapeamento só visual —
 * não é regra de domínio.
 */
interface CategoryStyle {
  label: string;
  accent: string;
  bg: string;
  tagBg: string;
}

const CATEGORY_STYLE: Record<string, CategoryStyle> = {
  compromisso: { label: "Compromisso", accent: "var(--color-brand-cyan)", bg: "color-mix(in srgb, var(--color-brand-cyan) 8%, transparent)", tagBg: "color-mix(in srgb, var(--color-brand-cyan) 14%, transparent)" },
  reuniao: { label: "Reunião", accent: "var(--color-brand-gold)", bg: "color-mix(in srgb, var(--color-brand-gold) 9%, transparent)", tagBg: "color-mix(in srgb, var(--color-brand-gold) 16%, transparent)" },
  pessoal: { label: "Pessoal", accent: "var(--color-category-green)", bg: "color-mix(in srgb, var(--color-category-green) 8%, transparent)", tagBg: "color-mix(in srgb, var(--color-category-green) 14%, transparent)" },
  prazo: { label: "Prazo", accent: "var(--color-category-lavender)", bg: "color-mix(in srgb, var(--color-category-lavender) 8%, transparent)", tagBg: "color-mix(in srgb, var(--color-category-lavender) 16%, transparent)" },
};

const FALLBACK_STYLE: CategoryStyle = {
  label: "Evento",
  accent: "var(--color-category-bluegray)",
  bg: "color-mix(in srgb, var(--color-category-bluegray) 8%, transparent)",
  tagBg: "color-mix(in srgb, var(--color-category-bluegray) 16%, transparent)",
};

export const CONFLICT_STYLE: CategoryStyle = {
  label: "Conflito",
  accent: "var(--color-error)",
  bg: "color-mix(in srgb, var(--color-error) 8%, transparent)",
  tagBg: "color-mix(in srgb, var(--color-error) 14%, transparent)",
};

export function categoryStyle(category: string): CategoryStyle {
  return CATEGORY_STYLE[category] ?? { ...FALLBACK_STYLE, label: category ? capitalize(category) : FALLBACK_STYLE.label };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatRange(event: CalendarEvent): string {
  return event.is_all_day ? "Dia inteiro" : `${formatTime(event.start_at)}–${formatTime(event.end_at)}`;
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
}

/** Título da seção de um dia nas visões Lista/Reuniões: "terça-feira, 16 de setembro". */
export function formatDayHeader(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

/** Chave local (AAAA-MM-DD) para agrupar por dia sem cair no dia UTC. */
export function localDayKey(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Pílula com a categoria (ou "Conflito") na cor da categoria. */
export function EventTag({ style }: { style: CategoryStyle }) {
  return (
    <span className="qv-pill shrink-0" style={{ background: style.tagBg, color: style.accent }}>
      {style.label}
    </span>
  );
}

/** Bloco de evento do mock: fundo tintado, borda esquerda de 3px na cor da categoria. */
export function EventBlock({
  event,
  style,
  meta,
  showRange = true,
  actions,
  onOpen,
}: {
  event: CalendarEvent;
  style: CategoryStyle;
  meta?: ReactNode;
  showRange?: boolean;
  actions?: ReactNode;
  onOpen?: () => void;
}) {
  return (
    <div
      className="rounded-md px-3.5 py-3 flex items-center gap-3 flex-wrap sm:flex-nowrap"
      style={{ background: style.bg, borderLeft: `3px solid ${style.accent}` }}
    >
      <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
        {onOpen ? (
          <button type="button" className="truncate text-left text-sm font-semibold text-text-primary hover:text-vex-cyan-bright" onClick={onOpen}>
            {event.title}
          </button>
        ) : (
          <span className="text-sm font-semibold text-text-primary truncate">{event.title}</span>
        )}
        {meta && <span className="text-xs text-text-secondary truncate">{meta}</span>}
      </div>
      {showRange && <span className="font-mono text-xs text-text-secondary whitespace-nowrap">{formatRange(event)}</span>}
      <EventTag style={style} />
      {actions}
    </div>
  );
}

/** Linha de metadados do evento: local e, se houver, indicação do link de reunião. */
export function eventMeta(event: CalendarEvent): string | undefined {
  const parts = [event.location, event.meeting_link ? "Link da reunião" : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

/** Agrupa eventos já ordenados por dia local (usado por Lista e Reuniões). */
export function groupEventsByDay(sorted: CalendarEvent[]): [string, CalendarEvent[]][] {
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of sorted) {
    const dayKey = localDayKey(event.start_at);
    const group = groups.get(dayKey) ?? [];
    group.push(event);
    groups.set(dayKey, group);
  }
  return Array.from(groups.entries());
}

/** Linha de evento dentro do card do dia: hora em mono, filete na cor da categoria, título, pílula. */
export function EventListRow({ event, actions, onOpen }: { event: CalendarEvent; actions?: ReactNode; onOpen?: () => void }) {
  const style = categoryStyle(event.category);
  const meta = eventMeta(event);
  return (
    <div className="qv-row flex items-center gap-3 px-5 py-3.5 flex-wrap sm:flex-nowrap">
      <span className="font-mono text-xs text-text-secondary w-[52px] shrink-0">
        {event.is_all_day ? "Dia todo" : formatTime(event.start_at)}
      </span>
      <span className="w-0.5 self-stretch rounded-sm shrink-0" style={{ background: style.accent }} aria-hidden />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        {onOpen ? (
          <button type="button" className="truncate text-left text-sm font-medium text-text-primary hover:text-vex-cyan-bright" onClick={onOpen}>
            {event.title}
          </button>
        ) : (
          <span className="text-sm font-medium text-text-primary truncate">{event.title}</span>
        )}
        {meta && <span className="text-xs text-text-muted truncate">{meta}</span>}
      </div>
      <EventTag style={style} />
      {actions}
    </div>
  );
}

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
  compromisso: { label: "Compromisso", accent: "#43B9D2", bg: "rgba(67,185,210,.08)", tagBg: "rgba(67,185,210,.14)" },
  reuniao: { label: "Reunião", accent: "#D2A66F", bg: "rgba(184,138,84,.09)", tagBg: "rgba(184,138,84,.16)" },
  pessoal: { label: "Pessoal", accent: "#6FAF91", bg: "rgba(111,175,145,.08)", tagBg: "rgba(111,175,145,.14)" },
  prazo: { label: "Prazo", accent: "#8A7FB5", bg: "rgba(138,127,181,.08)", tagBg: "rgba(138,127,181,.16)" },
};

const FALLBACK_STYLE: CategoryStyle = {
  label: "Evento",
  accent: "#687A91",
  bg: "rgba(104,122,145,.08)",
  tagBg: "rgba(104,122,145,.16)",
};

export const CONFLICT_STYLE: CategoryStyle = {
  label: "Conflito",
  accent: "#F05D6C",
  bg: "rgba(240,93,108,.08)",
  tagBg: "rgba(240,93,108,.14)",
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
export function localDayKey(iso: string): string {
  const d = new Date(iso);
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
}: {
  event: CalendarEvent;
  style: CategoryStyle;
  meta?: ReactNode;
  showRange?: boolean;
  actions?: ReactNode;
}) {
  return (
    <div
      className="rounded-md px-3.5 py-3 flex items-center gap-3 flex-wrap sm:flex-nowrap"
      style={{ background: style.bg, borderLeft: `3px solid ${style.accent}` }}
    >
      <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
        <span className="text-sm font-semibold text-text-primary truncate">{event.title}</span>
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
export function EventListRow({ event, actions }: { event: CalendarEvent; actions?: ReactNode }) {
  const style = categoryStyle(event.category);
  const meta = eventMeta(event);
  return (
    <div className="qv-row flex items-center gap-3 px-5 py-3.5 flex-wrap sm:flex-nowrap">
      <span className="font-mono text-xs text-text-secondary w-[52px] shrink-0">
        {event.is_all_day ? "Dia todo" : formatTime(event.start_at)}
      </span>
      <span className="w-0.5 self-stretch rounded-sm shrink-0" style={{ background: style.accent }} aria-hidden />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-sm font-medium text-text-primary truncate">{event.title}</span>
        {meta && <span className="text-xs text-text-muted truncate">{meta}</span>}
      </div>
      <EventTag style={style} />
      {actions}
    </div>
  );
}

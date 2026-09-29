import { CaretLeftIcon, CaretRightIcon, MapPinIcon, VideoCameraIcon } from "@phosphor-icons/react";
import { EmptyState, IconButton, cx } from "@qqorvex/ui";
import { eventCategory, eventsOnDay } from "../calendar";
import { addDays, addMonths, isSameDay, startOfDay, startOfMonth } from "../dateUtils";
import type { CalendarEvent } from "../types";

function monthMatrix(anchor: Date, weekStartsOn: 0 | 1 = 0): Date[] {
  const first = startOfMonth(anchor);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

const WEEKDAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function formatEventTime(event: CalendarEvent): string {
  if (event.is_all_day) return "Dia inteiro";
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(event.start_at)} – ${fmt(event.end_at)}`;
}

/** Visão Mês: grade de 6 semanas com até 3 eventos por dia e "+N". */
export function MonthGrid({ anchor, events, selectedDate, onSelectDay, onOpenEvent }: { anchor: Date; events: CalendarEvent[]; selectedDate: Date; onSelectDay: (day: Date) => void; onOpenEvent: (event: CalendarEvent) => void }) {
  const days = monthMatrix(anchor);
  const today = new Date();
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="grid grid-cols-7 border-b border-line">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-2 text-center text-2xs font-semibold uppercase tracking-[0.06em] text-fg-4">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((day) => {
          const inMonth = day.getMonth() === anchor.getMonth();
          const dayEvents = eventsOnDay(events, day);
          const isToday = isSameDay(day, today);
          const selected = isSameDay(day, selectedDate);
          return (
            <div
              key={day.toISOString()}
              className={cx("flex min-h-[92px] min-w-0 flex-col gap-0.5 border-b border-l border-line-soft p-1 sm:min-h-[112px] [&:nth-child(7n+1)]:border-l-0", !inMonth && "bg-canvas/40", selected && "bg-selected")}
            >
              <button
                type="button"
                onClick={() => onSelectDay(day)}
                aria-label={day.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                className={cx(
                  "mb-0.5 flex h-6 min-w-6 items-center justify-center self-start rounded-full px-1 text-xs font-medium tabular-nums transition-colors",
                  isToday ? "bg-gold text-on-gold" : inMonth ? "text-fg-2 hover:bg-hover" : "text-fg-4 hover:bg-hover",
                )}
              >
                {day.getDate()}
              </button>
              {dayEvents.slice(0, 3).map((event) => {
                const category = eventCategory(event.category);
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onOpenEvent(event)}
                    className="flex min-w-0 items-center gap-1 rounded px-1 py-px text-left text-2xs leading-4 transition-colors hover:bg-hover"
                    title={`${event.title} · ${formatEventTime(event)}`}
                  >
                    <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: category.color }} />
                    {!event.is_all_day && <span className="hidden shrink-0 tabular-nums text-fg-4 sm:inline">{new Date(event.start_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
                    <span className="truncate text-fg-2">{event.title}</span>
                  </button>
                );
              })}
              {dayEvents.length > 3 && (
                <button type="button" onClick={() => onSelectDay(day)} className="px-1 text-left text-2xs font-medium text-fg-3 hover:text-fg">
                  +{dayEvents.length - 3} mais
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Minicalendário para escolher o dia (barra lateral). */
export function MiniMonth({ month, selectedDate, events, onSelectDay, onChangeMonth }: { month: Date; selectedDate: Date; events: CalendarEvent[]; onSelectDay: (day: Date) => void; onChangeMonth: (month: Date) => void }) {
  const days = monthMatrix(month);
  const today = new Date();
  const busy = new Set(events.map((event) => startOfDay(new Date(event.start_at)).toDateString()));
  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-fg">{(() => { const label = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }); return label.charAt(0).toUpperCase() + label.slice(1); })()}</p>
        <div className="flex">
          <IconButton size="sm" label="Mês anterior" onClick={() => onChangeMonth(addMonths(month, -1))}>
            <CaretLeftIcon />
          </IconButton>
          <IconButton size="sm" label="Próximo mês" onClick={() => onChangeMonth(addMonths(month, 1))}>
            <CaretRightIcon />
          </IconButton>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="pb-1 text-2xs uppercase text-fg-4">
            {label[0]}
          </span>
        ))}
        {days.map((day) => {
          const inMonth = day.getMonth() === month.getMonth();
          const selected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              aria-pressed={selected}
              aria-label={day.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}
              className={cx(
                "relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs tabular-nums transition-colors",
                selected ? "bg-gold font-semibold text-on-gold" : isToday ? "font-semibold text-gold-fg hover:bg-hover" : inMonth ? "text-fg-2 hover:bg-hover" : "text-fg-4 hover:bg-hover",
              )}
            >
              {day.getDate()}
              {busy.has(day.toDateString()) && !selected && <span aria-hidden="true" className="absolute bottom-1 h-1 w-1 rounded-full bg-fg-4" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Visão Lista: próximos eventos agrupados por dia. */
export function AgendaList({ events, from, days, onOpenEvent, onCreate }: { events: CalendarEvent[]; from: Date; days: number; onOpenEvent: (event: CalendarEvent) => void; onCreate: () => void }) {
  const groups = Array.from({ length: days }, (_, index) => addDays(startOfDay(from), index))
    .map((day) => ({ day, events: eventsOnDay(events, day) }))
    .filter((group) => group.events.length > 0);
  const today = new Date();

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line">
        <EmptyState title="Nenhum evento neste período" description="Seus próximos compromissos aparecem aqui, agrupados por dia." action={<button type="button" onClick={onCreate} className="text-[13px] font-medium text-gold-fg hover:underline">Criar evento</button>} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        const isToday = isSameDay(group.day, today);
        return (
          <section key={group.day.toISOString()} className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
            <header className="flex items-baseline gap-2 sm:flex-col sm:gap-0 sm:pt-2">
              <span className={cx("font-display text-[22px] font-semibold leading-none tabular-nums", isToday ? "text-gold-fg" : "text-fg")}>{group.day.getDate()}</span>
              <span className="text-xs capitalize text-fg-3">{isToday ? "Hoje" : group.day.toLocaleDateString("pt-BR", { weekday: "long" })}</span>
              <span className="text-2xs capitalize text-fg-4 sm:mt-0.5">{group.day.toLocaleDateString("pt-BR", { month: "long" })}</span>
            </header>
            <ul className="divide-y divide-line-soft overflow-hidden rounded-xl border border-line bg-surface">
              {group.events.map((event) => {
                const category = eventCategory(event.category);
                return (
                  <li key={event.id}>
                    <button type="button" onClick={() => onOpenEvent(event)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-hover">
                      <span aria-hidden="true" className="h-9 w-[3px] shrink-0 rounded-full" style={{ background: category.color }} />
                      <span className="w-[92px] shrink-0 text-xs tabular-nums text-fg-3">{formatEventTime(event)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-fg">{event.title}</span>
                        <span className="mt-0.5 flex items-center gap-3 text-xs text-fg-4">
                          <span>{category.label}</span>
                          {event.location && (
                            <span className="inline-flex min-w-0 items-center gap-1 truncate">
                              <MapPinIcon size={12} /> {event.location}
                            </span>
                          )}
                          {event.meeting_link && (
                            <span className="inline-flex items-center gap-1">
                              <VideoCameraIcon size={12} /> Online
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

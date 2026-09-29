import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { cx } from "@qqorvex/ui";
import { allDayEventsFor, eventCategory, layoutDayEvents, snapMinutes, type PositionedEvent } from "../calendar";
import { addDays, isSameDay, startOfDay } from "../dateUtils";
import type { CalendarEvent } from "../types";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function timeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function eventTimeRange(event: CalendarEvent): string {
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(event.start_at)} – ${fmt(event.end_at)}`;
}

interface DragState {
  mode: "move" | "resize";
  eventId: string;
  pointerId: number;
  originX: number;
  originY: number;
  dayIndex: number;
  startMinute: number;
  endMinute: number;
  deltaMinutes: number;
  deltaDays: number;
  moved: boolean;
}

export interface TimeGridProps {
  days: Date[];
  events: CalendarEvent[];
  onCreateAt: (start: Date, end: Date) => void;
  onOpenEvent: (event: CalendarEvent) => void;
  onMoveEvent: (event: CalendarEvent, start: Date, end: Date) => void;
  onSelectDay?: (day: Date) => void;
  hourHeight?: number;
  /** Altura da área rolável (CSS). */
  height?: string;
}

/**
 * Grade de horários (Dia/Semana). Clique num horário livre cria um evento de 1 h; arrastar um
 * evento move (inclusive para outro dia na semana) e puxar a borda inferior muda a duração.
 * Tudo em passos de 15 minutos.
 */
export function TimeGrid({ days, events, onCreateAt, onOpenEvent, onMoveEvent, onSelectDay, hourHeight = 48, height = "min(calc(100dvh - 260px), 900px)" }: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [now, setNow] = useState(() => new Date());
  const pxPerMinute = hourHeight / 60;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const layouts = useMemo(() => days.map((day) => layoutDayEvents(events, day)), [days, events]);
  const allDay = useMemo(() => days.map((day) => allDayEventsFor(events, day)), [days, events]);
  const hasAllDay = allDay.some((list) => list.length > 0);

  // Rola até o horário relevante (agora, ou o primeiro evento) ao abrir.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const includesToday = days.some((day) => isSameDay(day, new Date()));
    const firstEventMinute = Math.min(...layouts.flat().map((item) => item.startMinute), 24 * 60);
    const nowMinute = now.getHours() * 60 + now.getMinutes();
    const target = includesToday && nowMinute >= 7 * 60 ? Math.max(0, nowMinute - 90) : Math.max(0, Math.min(firstEventMinute, 8 * 60) - 30);
    element.scrollTop = target * pxPerMinute;
    // Só na montagem e ao trocar de período.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0]?.toDateString(), days.length]);

  useEffect(() => {
    if (!drag) return;
    const columnWidth = (columnsRef.current?.getBoundingClientRect().width ?? 1) / days.length;
    function onMove(event: PointerEvent) {
      setDrag((current) => {
        if (!current || event.pointerId !== current.pointerId) return current;
        const dy = event.clientY - current.originY;
        const dx = event.clientX - current.originX;
        const moved = current.moved || Math.abs(dy) > 4 || Math.abs(dx) > 6;
        const deltaMinutes = snapMinutes(dy / pxPerMinute + 10_000) - 10_000;
        const deltaDays = current.mode === "move" && days.length > 1 ? Math.max(-current.dayIndex, Math.min(days.length - 1 - current.dayIndex, Math.round(dx / columnWidth))) : 0;
        return { ...current, deltaMinutes, deltaDays, moved };
      });
    }
    function onUp(event: PointerEvent) {
      setDrag((current) => {
        if (!current || event.pointerId !== current.pointerId) return current;
        const target = events.find((item) => item.id === current.eventId);
        if (target) {
          if (!current.moved) {
            onOpenEvent(target);
          } else {
            const day = days[current.dayIndex + current.deltaDays]!;
            const base = startOfDay(day);
            const duration = current.endMinute - current.startMinute;
            let startMinute = current.startMinute;
            let endMinute = current.endMinute;
            if (current.mode === "move") {
              startMinute = Math.max(0, Math.min(1440 - 15, current.startMinute + current.deltaMinutes));
              endMinute = startMinute + duration;
            } else {
              endMinute = Math.max(current.startMinute + 15, Math.min(1440, current.endMinute + current.deltaMinutes));
            }
            const start = new Date(base.getTime() + startMinute * 60_000);
            const end = new Date(base.getTime() + endMinute * 60_000);
            if (start.getTime() !== new Date(target.start_at).getTime() || end.getTime() !== new Date(target.end_at).getTime()) onMoveEvent(target, start, end);
          }
        }
        return null;
      });
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // `drag` identifica a sessão de arraste; os demais valores são estáveis durante ela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.eventId, drag?.pointerId]);

  function startDrag(event: ReactPointerEvent, item: PositionedEvent, dayIndex: number, mode: DragState["mode"]) {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    setDrag({ mode, eventId: item.event.id, pointerId: event.pointerId, originX: event.clientX, originY: event.clientY, dayIndex, startMinute: item.startMinute, endMinute: item.endMinute, deltaMinutes: 0, deltaDays: 0, moved: false });
  }

  function createFromClick(event: ReactMouseEvent<HTMLDivElement>, day: Date) {
    const rect = event.currentTarget.getBoundingClientRect();
    const minute = Math.max(0, Math.min(1440 - 60, Math.floor(((event.clientY - rect.top) / pxPerMinute) / 30) * 30));
    const start = new Date(startOfDay(day).getTime() + minute * 60_000);
    onCreateAt(start, new Date(start.getTime() + 60 * 60_000));
  }

  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const gridTemplate = { gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` };

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface">
      {/* Cabeçalho dos dias */}
      <div className="grid border-b border-line" style={gridTemplate}>
        <div />
        {days.map((day) => {
          const today = isSameDay(day, now);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay?.(day)}
              disabled={!onSelectDay}
              className="flex flex-col items-center gap-0.5 border-l border-line-soft py-2 transition-colors enabled:hover:bg-hover"
            >
              <span className={cx("text-2xs font-semibold uppercase tracking-[0.06em]", today ? "text-gold-fg" : "text-fg-4")}>{day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</span>
              <span className={cx("flex h-7 min-w-7 items-center justify-center rounded-full px-1 font-display text-[16px] font-semibold tabular-nums", today ? "bg-gold text-on-gold" : "text-fg")}>{day.getDate()}</span>
            </button>
          );
        })}
      </div>

      {hasAllDay && (
        <div className="grid border-b border-line" style={gridTemplate}>
          <div className="flex items-center justify-end pr-2 text-2xs text-fg-4">dia todo</div>
          {allDay.map((list, index) => (
            <div key={index} className="flex min-w-0 flex-col gap-0.5 border-l border-line-soft p-1">
              {list.map((event) => {
                const category = eventCategory(event.category);
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onOpenEvent(event)}
                    className="truncate rounded-md px-1.5 py-0.5 text-left text-2xs font-medium text-fg"
                    style={{ background: `color-mix(in srgb, ${category.color} 22%, var(--q-surface))` }}
                    title={`${event.title} · dia inteiro`}
                  >
                    {event.title}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Grade rolável */}
      <div ref={scrollRef} className="relative overflow-y-auto" style={{ height }}>
        <div className="grid" style={{ ...gridTemplate, height: 24 * hourHeight }}>
          <div className="relative">
            {HOURS.map((hour) =>
              hour === 0 ? null : (
                <span key={hour} className="absolute right-2 -translate-y-1/2 text-2xs tabular-nums text-fg-4" style={{ top: hour * hourHeight }}>
                  {String(hour).padStart(2, "0")}:00
                </span>
              ),
            )}
          </div>
          <div ref={columnsRef} className="relative grid" style={{ gridColumn: "2 / -1", gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
            {days.map((day, dayIndex) => {
              const isToday = isSameDay(day, now);
              return (
                <div
                  key={day.toISOString()}
                  className={cx("relative border-l border-line-soft", isToday && "bg-gold/[0.025]")}
                  style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${hourHeight - 1}px, var(--q-line-soft) ${hourHeight - 1}px, var(--q-line-soft) ${hourHeight}px)` }}
                  onClick={(event) => {
                    if (event.target === event.currentTarget) createFromClick(event, day);
                  }}
                  role="presentation"
                >
                  {layouts[dayIndex]!.map((item) => {
                    const dragging = drag?.eventId === item.event.id && drag.moved;
                    const category = eventCategory(item.event.category);
                    let top = item.startMinute * pxPerMinute;
                    let blockHeight = (item.endMinute - item.startMinute) * pxPerMinute;
                    let columnShift = 0;
                    if (dragging && drag) {
                      if (drag.mode === "move") {
                        top = Math.max(0, Math.min(1440 - (item.endMinute - item.startMinute), item.startMinute + drag.deltaMinutes)) * pxPerMinute;
                        columnShift = drag.deltaDays;
                      } else {
                        blockHeight = Math.max(15, item.endMinute - item.startMinute + drag.deltaMinutes) * pxPerMinute;
                      }
                    }
                    const compact = blockHeight < 38;
                    const past = new Date(item.event.end_at) < now;
                    const width = dragging ? 100 : 100 / item.columns;
                    const left = dragging ? 0 : (100 / item.columns) * item.column;
                    return (
                      <div
                        key={item.event.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`${item.event.title}, ${eventTimeRange(item.event)}`}
                        onPointerDown={(event) => startDrag(event, item, dayIndex, "move")}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onOpenEvent(item.event);
                          }
                        }}
                        className={cx(
                          "group absolute touch-none select-none overflow-hidden rounded-md border-l-[3px] px-1.5 text-left transition-shadow",
                          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--q-focus)]",
                          dragging ? "z-20 cursor-grabbing shadow-lg ring-1 ring-gold-line" : "z-10 cursor-pointer hover:z-20 hover:shadow-md",
                          past && !dragging && "opacity-60",
                        )}
                        style={{
                          top: top + 1,
                          height: Math.max(18, blockHeight - 2),
                          left: `calc(${left}% + 2px + ${columnShift * 100}%)`,
                          width: `calc(${width}% - 4px)`,
                          borderLeftColor: category.color,
                          background: `color-mix(in srgb, ${category.color} 18%, var(--q-surface))`,
                        }}
                        title={`${item.event.title}\n${eventTimeRange(item.event)}${item.event.location ? `\n${item.event.location}` : ""}`}
                      >
                        {compact ? (
                          <p className="truncate pt-px text-2xs leading-4 text-fg">
                            <span className="font-medium">{item.event.title}</span>
                            <span className="text-fg-3"> · {timeLabel(dragging && drag?.mode === "move" ? item.startMinute + drag.deltaMinutes : item.startMinute)}</span>
                          </p>
                        ) : (
                          <div className="flex flex-col pt-1">
                            <p className="line-clamp-2 text-xs font-medium leading-tight text-fg">{item.event.title}</p>
                            <p className="mt-0.5 truncate text-2xs tabular-nums text-fg-3">
                              {dragging && drag
                                ? drag.mode === "move"
                                  ? `${timeLabel(item.startMinute + drag.deltaMinutes)} – ${timeLabel(item.endMinute + drag.deltaMinutes)}`
                                  : `${timeLabel(item.startMinute)} – ${timeLabel(Math.max(item.startMinute + 15, item.endMinute + drag.deltaMinutes))}`
                                : eventTimeRange(item.event)}
                            </p>
                            {item.event.location && blockHeight > 64 && <p className="truncate text-2xs text-fg-4">{item.event.location}</p>}
                          </div>
                        )}
                        <span
                          aria-hidden="true"
                          onPointerDown={(event) => startDrag(event, item, dayIndex, "resize")}
                          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100"
                        >
                          <span className="mx-auto mt-[3px] block h-[2px] w-6 rounded-full bg-fg-4" />
                        </span>
                      </div>
                    );
                  })}
                  {isToday && (
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-30 flex items-center" style={{ top: nowMinute * pxPerMinute - 1 }}>
                      <span className="-ml-[5px] h-2.5 w-2.5 rounded-full bg-gold" />
                      <span className="h-[2px] flex-1 bg-gold" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function weekDays(anchor: Date, weekStartsOn: 0 | 1 = 0): Date[] {
  const start = startOfDay(anchor);
  const diff = (start.getDay() - weekStartsOn + 7) % 7;
  const first = addDays(start, -diff);
  return Array.from({ length: 7 }, (_, index) => addDays(first, index));
}

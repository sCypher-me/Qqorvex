import { useState } from "react";
import { ConfirmDialog } from "@qqorvex/ui";
import type { CalendarEvent } from "../types";
import { findConflicts } from "../service";
import { CONFLICT_STYLE, EventBlock, categoryStyle, eventMeta } from "./EventStyle";

const DEFAULT_FIRST_HOUR = 8;
const DEFAULT_LAST_HOUR = 18;

/**
 * "Meu Dia": timeline do dia selecionado em ordem cronológica, com eventos de dia inteiro
 * separados da linha horária. Visual do mock: grade por hora (hora em mono) com blocos tintados.
 * Um evento que sobrepõe outro que começou antes aparece como "Conflito" (mesma regra de
 * `findConflicts`, só exibida — nada é alterado).
 */
export function DayAgenda({
  events,
  onDelete,
}: {
  events: CalendarEvent[];
  onDelete: (eventId: string) => void;
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const allDayEvents = events.filter((e) => e.is_all_day);
  const timedEvents = events
    .filter((e) => !e.is_all_day)
    .sort((a, b) => a.start_at.localeCompare(b.start_at));

  const hours = timedEvents.map((e) => new Date(e.start_at).getHours());
  const firstHour = Math.min(DEFAULT_FIRST_HOUR, ...hours);
  const lastHour = Math.max(DEFAULT_LAST_HOUR, ...hours);
  const hourRows = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i);

  const confirmEvent = events.find((e) => e.id === confirmDeleteId) ?? null;

  function conflictsFor(event: CalendarEvent, index: number): CalendarEvent[] {
    const earlier = timedEvents.slice(0, index);
    return findConflicts(earlier, { startAt: event.start_at, endAt: event.end_at, excludeEventId: event.id });
  }

  function deleteButton(event: CalendarEvent) {
    return (
      <button
        type="button"
        className="qv-icon-btn shrink-0"
        onClick={() => setConfirmDeleteId(event.id)}
        aria-label={`Excluir "${event.title}"`}
        title="Excluir"
      >
        ✕
      </button>
    );
  }

  return (
    <div className="qv-card px-5 pt-2 pb-5">
      {events.length === 0 && (
        <p className="text-sm text-text-secondary pt-3 pb-2">Nada agendado para este dia.</p>
      )}

      {allDayEvents.length > 0 && (
        <div className="flex gap-4 items-stretch min-h-16 py-2.5">
          <span className="text-xs text-text-muted w-12 shrink-0 pt-1">Dia todo</span>
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            {allDayEvents.map((event) => (
              <EventBlock
                key={event.id}
                event={event}
                style={categoryStyle(event.category)}
                meta={eventMeta(event)}
                actions={deleteButton(event)}
              />
            ))}
          </div>
        </div>
      )}

      {hourRows.map((hour) => {
        const rowEvents = timedEvents
          .map((event, index) => ({ event, index }))
          .filter(({ event }) => new Date(event.start_at).getHours() === hour);
        return (
          <div key={hour} className="flex gap-4 items-stretch min-h-16 py-2.5 border-t border-[rgba(42,48,57,.55)]">
            <span className="font-mono text-xs text-text-muted w-12 shrink-0 pt-1">
              {String(hour).padStart(2, "0")}:00
            </span>
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              {rowEvents.map(({ event, index }) => {
                const conflicts = conflictsFor(event, index);
                const hasConflict = conflicts.length > 0;
                const meta = hasConflict
                  ? `Conflita com ${conflicts.map((c) => c.title).join(", ")}`
                  : eventMeta(event);
                return (
                  <EventBlock
                    key={event.id}
                    event={event}
                    style={hasConflict ? CONFLICT_STYLE : categoryStyle(event.category)}
                    meta={meta}
                    actions={deleteButton(event)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      <ConfirmDialog
        isOpen={confirmEvent !== null}
        title={`Excluir "${confirmEvent?.title}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          if (confirmEvent) onDelete(confirmEvent.id);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}

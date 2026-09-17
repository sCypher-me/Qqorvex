import { useState } from "react";
import { ConfirmDialog } from "@qqorvex/ui";
import type { CalendarEvent } from "../types";
import { EventListRow, formatDayHeader, groupEventsByDay } from "./EventStyle";

/** Lista cronológica agrupada por dia — útil para varrer um período mais longo sem trocar de tela. */
export function ListView({ events, onDelete }: { events: CalendarEvent[]; onDelete: (eventId: string) => void }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (events.length === 0) {
    return (
      <div className="qv-card p-5">
        <p className="text-sm text-text-secondary">Nada agendado neste período.</p>
      </div>
    );
  }

  const sorted = [...events].sort((a, b) => a.start_at.localeCompare(b.start_at));
  const confirmEvent = sorted.find((event) => event.id === confirmDeleteId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      {groupEventsByDay(sorted).map(([dayKey, dayEvents]) => (
        <section key={dayKey} className="flex flex-col gap-2.5">
          <h3 className="qv-section-label">{formatDayHeader(dayEvents[0]!.start_at)}</h3>
          <div className="qv-card">
            {dayEvents.map((event) => (
              <EventListRow
                key={event.id}
                event={event}
                actions={
                  <button
                    type="button"
                    className="qv-icon-btn shrink-0"
                    onClick={() => setConfirmDeleteId(event.id)}
                    aria-label={`Excluir "${event.title}"`}
                    title="Excluir"
                  >
                    ✕
                  </button>
                }
              />
            ))}
          </div>
        </section>
      ))}
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

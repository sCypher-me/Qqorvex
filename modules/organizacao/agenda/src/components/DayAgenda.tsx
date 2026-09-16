import { useState } from "react";
import { Card, Button, ConfirmDialog } from "@qqorvex/ui";
import type { CalendarEvent } from "../types";

/**
 * "Meu Dia": timeline do dia selecionado em ordem cronológica, com eventos de dia inteiro
 * separados da linha horária.
 */
export function DayAgenda({
  events,
  onDelete,
}: {
  events: CalendarEvent[];
  onDelete: (eventId: string) => void;
}) {
  const allDayEvents = events.filter((e) => e.is_all_day);
  const timedEvents = events
    .filter((e) => !e.is_all_day)
    .sort((a, b) => a.start_at.localeCompare(b.start_at));

  if (events.length === 0) {
    return <p className="font-sans text-text-secondary-warm">Nada agendado para este dia.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {allDayEvents.length > 0 && (
        <div className="flex flex-col gap-2">
          {allDayEvents.map((event) => (
            <EventRow key={event.id} event={event} onDelete={() => onDelete(event.id)} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {timedEvents.map((event) => (
          <EventRow key={event.id} event={event} onDelete={() => onDelete(event.id)} />
        ))}
      </div>
    </div>
  );
}

function EventRow({ event, onDelete }: { event: CalendarEvent; onDelete: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const time = event.is_all_day
    ? "Dia inteiro"
    : `${formatTime(event.start_at)} – ${formatTime(event.end_at)}`;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-brand-cyan">{time}</p>
          <p className="font-sans text-sm text-text-primary">{event.title}</p>
          {event.location && <p className="font-sans text-xs text-text-secondary-warm">{event.location}</p>}
        </div>
        <Button type="button" variant="chip" onClick={() => setConfirmOpen(true)}>
          Excluir
        </Button>
      </div>
      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Excluir "${event.title}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </Card>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

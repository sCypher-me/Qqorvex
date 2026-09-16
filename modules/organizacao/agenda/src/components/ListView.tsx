import { useState } from "react";
import { Card, Button, ConfirmDialog } from "@qqorvex/ui";
import type { CalendarEvent } from "../types";

function formatDateHeader(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Lista cronológica agrupada por dia — útil para varrer um período mais longo sem trocar de tela. */
export function ListView({ events, onDelete }: { events: CalendarEvent[]; onDelete: (eventId: string) => void }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (events.length === 0) {
    return <p className="font-sans text-text-secondary-warm">Nada agendado neste período.</p>;
  }

  const sorted = [...events].sort((a, b) => a.start_at.localeCompare(b.start_at));
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of sorted) {
    const dayKey = event.start_at.slice(0, 10);
    const group = groups.get(dayKey) ?? [];
    group.push(event);
    groups.set(dayKey, group);
  }

  const confirmEvent = sorted.find((event) => event.id === confirmDeleteId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {Array.from(groups.entries()).map(([dayKey, dayEvents]) => (
        <div key={dayKey} className="flex flex-col gap-2">
          <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-text-secondary-warm">
            {formatDateHeader(dayEvents[0]!.start_at)}
          </h3>
          {dayEvents.map((event) => (
            <Card key={event.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-brand-cyan">{event.is_all_day ? "Dia inteiro" : formatTime(event.start_at)}</p>
                  <p className="font-sans text-sm text-text-primary">{event.title}</p>
                  {event.location && <p className="font-sans text-xs text-text-secondary-warm">{event.location}</p>}
                </div>
                <Button type="button" variant="chip" onClick={() => setConfirmDeleteId(event.id)}>
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
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

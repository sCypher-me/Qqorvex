import { useState } from "react";
import { Card, Button, ConfirmDialog } from "@qqorvex/ui";
import type { CalendarEvent } from "../types";

function formatDateHeader(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** "Reuniões dedicadas" — recorte da Agenda só com `category === "reuniao"`, sem duplicar o
 * registro do evento; o link fica em destaque para entrar direto. */
export function MeetingsView({ events, onDelete }: { events: CalendarEvent[]; onDelete: (eventId: string) => void }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const meetings = events.filter((e) => e.category === "reuniao").sort((a, b) => a.start_at.localeCompare(b.start_at));

  if (meetings.length === 0) {
    return <p className="font-sans text-text-secondary-warm">Nenhuma reunião agendada neste período.</p>;
  }

  const groups = new Map<string, CalendarEvent[]>();
  for (const meeting of meetings) {
    const dayKey = meeting.start_at.slice(0, 10);
    const group = groups.get(dayKey) ?? [];
    group.push(meeting);
    groups.set(dayKey, group);
  }

  const confirmMeeting = meetings.find((meeting) => meeting.id === confirmDeleteId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {Array.from(groups.entries()).map(([dayKey, dayMeetings]) => (
        <div key={dayKey} className="flex flex-col gap-2">
          <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-text-secondary-warm">
            {formatDateHeader(dayMeetings[0]!.start_at)}
          </h3>
          {dayMeetings.map((meeting) => (
            <Card key={meeting.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-brand-cyan">{formatTime(meeting.start_at)}</p>
                  <p className="font-sans text-sm text-text-primary">{meeting.title}</p>
                  {meeting.location && <p className="font-sans text-xs text-text-secondary-warm">{meeting.location}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {meeting.meeting_link && (
                    <a
                      href={meeting.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-md bg-brand-cyan text-background font-semibold hover:opacity-90"
                    >
                      Entrar
                    </a>
                  )}
                  <Button type="button" variant="chip" onClick={() => setConfirmDeleteId(meeting.id)}>
                    Excluir
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ))}
      <ConfirmDialog
        isOpen={confirmMeeting !== null}
        title={`Excluir "${confirmMeeting?.title}"?`}
        description="Essa ação não pode ser desfeita."
        onConfirm={() => {
          if (confirmMeeting) onDelete(confirmMeeting.id);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}

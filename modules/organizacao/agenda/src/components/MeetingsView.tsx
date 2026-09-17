import { useState } from "react";
import { ConfirmDialog } from "@qqorvex/ui";
import type { CalendarEvent } from "../types";
import { EventListRow, formatDayHeader, groupEventsByDay } from "./EventStyle";

/** "Reuniões dedicadas" — recorte da Agenda só com `category === "reuniao"`, sem duplicar o
 * registro do evento; o link fica em destaque para entrar direto. */
export function MeetingsView({ events, onDelete }: { events: CalendarEvent[]; onDelete: (eventId: string) => void }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const meetings = events.filter((e) => e.category === "reuniao").sort((a, b) => a.start_at.localeCompare(b.start_at));

  if (meetings.length === 0) {
    return (
      <div className="qv-card p-5">
        <p className="text-sm text-text-secondary">Nenhuma reunião agendada neste período.</p>
      </div>
    );
  }

  const confirmMeeting = meetings.find((meeting) => meeting.id === confirmDeleteId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      {groupEventsByDay(meetings).map(([dayKey, dayMeetings]) => (
        <section key={dayKey} className="flex flex-col gap-2.5">
          <h3 className="qv-section-label">{formatDayHeader(dayMeetings[0]!.start_at)}</h3>
          <div className="qv-card">
            {dayMeetings.map((meeting) => (
              <EventListRow
                key={meeting.id}
                event={meeting}
                actions={
                  <div className="flex items-center gap-2 shrink-0">
                    {meeting.meeting_link && (
                      <a
                        href={meeting.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="qv-btn qv-btn-vex qv-btn-xs"
                      >
                        Entrar
                      </a>
                    )}
                    <button
                      type="button"
                      className="qv-icon-btn"
                      onClick={() => setConfirmDeleteId(meeting.id)}
                      aria-label={`Excluir "${meeting.title}"`}
                      title="Excluir"
                    >
                      ✕
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        </section>
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

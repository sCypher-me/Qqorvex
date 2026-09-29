import { useState } from "react";
import { Button, ConfirmDialog } from "@qqorvex/ui";
import type { CalendarEvent } from "../types";
import { EventListRow, formatDayHeader, groupEventsByDay } from "./EventStyle";
import { normalizeEventSearchText } from "../service";

/** "Reuniões dedicadas" — recorte da Agenda só com `category === "reuniao"`, sem duplicar o
 * registro do evento; o link fica em destaque para entrar direto. */
export function MeetingsView({ events, onDelete, onEdit, onCreate }: { events: CalendarEvent[]; onDelete: (eventId: string) => void; onEdit: (event: CalendarEvent) => void; onCreate?: () => void }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const allMeetings = events.filter((event) => event.category === "reuniao").sort((a, b) => a.start_at.localeCompare(b.start_at));
  const normalizedQuery = normalizeEventSearchText(query);
  const meetings = allMeetings.filter((meeting) => !normalizedQuery || normalizeEventSearchText([
    meeting.title,
    meeting.description,
    meeting.location,
    meeting.meeting_link,
  ].filter(Boolean).join(" ")).includes(normalizedQuery));

  const confirmMeeting = meetings.find((meeting) => meeting.id === confirmDeleteId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="qv-card flex flex-wrap items-center gap-2.5 p-3.5">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar reuniões por título, local ou link"
          aria-label="Buscar reuniões"
          className="qv-field min-w-[220px] flex-1 py-2 text-[13px]"
        />
        <span className="font-mono text-xs text-text-muted">{meetings.length} visíveis</span>
      </div>
      {meetings.length === 0 ? (
        <div className="qv-card flex min-h-[250px] flex-col items-center justify-center gap-2.5 p-6 text-center">
          <h2 className="text-base font-semibold text-text-primary">
            {normalizedQuery ? "Nenhuma reunião encontrada" : "Nenhuma reunião neste período"}
          </h2>
          <p className="m-0 max-w-[320px] text-sm text-text-secondary">
            {normalizedQuery ? "Tente outro termo ou limpe a busca." : "Crie uma reunião Zoom acima ou registre uma reunião com link para encontrá-la aqui."}
          </p>
          {normalizedQuery ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => setQuery("")}>Limpar busca</Button>
          ) : onCreate ? (
            <Button type="button" variant="secondary" size="sm" onClick={onCreate}>Nova reunião</Button>
          ) : null}
        </div>
      ) : groupEventsByDay(meetings).map(([dayKey, dayMeetings]) => (
        <section key={dayKey} className="flex flex-col gap-2.5">
          <h3 className="qv-section-label">{formatDayHeader(dayMeetings[0]!.start_at)}</h3>
          <div className="qv-card">
            {dayMeetings.map((meeting) => (
              <EventListRow
                key={meeting.id}
                event={meeting}
                onOpen={() => onEdit(meeting)}
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

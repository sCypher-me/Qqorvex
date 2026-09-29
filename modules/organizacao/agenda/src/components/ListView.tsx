import { useState } from "react";
import { Button, ConfirmDialog } from "@qqorvex/ui";
import type { CalendarEvent } from "../types";
import { normalizeEventSearchText } from "../service";
import { EventListRow, formatDayHeader, groupEventsByDay } from "./EventStyle";

/** Lista cronológica agrupada por dia — útil para varrer um período mais longo sem trocar de tela. */
export function ListView({ events, onDelete, onEdit, onCreate }: { events: CalendarEvent[]; onDelete: (eventId: string) => void; onEdit: (event: CalendarEvent) => void; onCreate?: () => void }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todas");

  if (events.length === 0) {
    return (
      <div className="qv-card flex min-h-[250px] flex-col items-center justify-center gap-2.5 p-6 text-center">
        <h2 className="text-base font-semibold text-text-primary">Nenhum evento neste período</h2>
        <p className="m-0 max-w-[320px] text-sm text-text-secondary">Crie um compromisso ou ajuste o período para encontrar o que procura.</p>
        {onCreate && <Button type="button" variant="primary" size="sm" onClick={onCreate}>Novo evento</Button>}
      </div>
    );
  }

  const filtered = events.filter((event) => {
    const searchableText = normalizeEventSearchText([
      event.title,
      event.description,
      event.location,
      event.meeting_link,
    ].filter(Boolean).join(" "));
    const matchesQuery = !query.trim() || searchableText.includes(normalizeEventSearchText(query));
    const matchesCategory = category === "todas" || event.category === category;
    return matchesQuery && matchesCategory;
  });
  const sorted = [...filtered].sort((a, b) => a.start_at.localeCompare(b.start_at));
  const confirmEvent = sorted.find((event) => event.id === confirmDeleteId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="qv-card flex flex-wrap items-center gap-2.5 p-3.5">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na agenda" aria-label="Buscar na agenda" className="qv-field min-w-[220px] flex-1 py-2 text-[13px]" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filtrar por categoria" className="qv-field w-auto py-2 text-[13px]">
          <option value="todas">Todas as categorias</option>
          <option value="compromisso">Compromissos</option>
          <option value="reuniao">Reuniões</option>
          <option value="prazo">Prazos</option>
          <option value="pessoal">Pessoais</option>
        </select>
        <span className="font-mono text-xs text-text-muted">{sorted.length} visíveis</span>
      </div>
      {sorted.length === 0 && (
        <div className="qv-card flex min-h-[220px] flex-col items-center justify-center gap-2.5 p-6 text-center">
          <h2 className="text-base font-semibold text-text-primary">Nenhum evento combina com os filtros</h2>
          <p className="m-0 text-sm text-text-secondary">Tente outro termo ou mostre todas as categorias.</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => { setQuery(""); setCategory("todas"); }}>Limpar filtros</Button>
        </div>
      )}
      {groupEventsByDay(sorted).map(([dayKey, dayEvents]) => (
        <section key={dayKey} className="flex flex-col gap-2.5">
          <h3 className="qv-section-label">{formatDayHeader(dayEvents[0]!.start_at)}</h3>
          <div className="qv-card">
            {dayEvents.map((event) => (
              <EventListRow
                key={event.id}
                event={event}
                onOpen={() => onEdit(event)}
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

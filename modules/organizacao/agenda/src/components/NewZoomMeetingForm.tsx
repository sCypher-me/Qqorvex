import { useState, type FormEvent } from "react";
import { Button } from "@qqorvex/ui";

/**
 * Cria a reunião no Zoom e o evento na Agenda numa única ação — sem precisar criar o evento
 * manualmente antes (decisão explícita do usuário). O formulário manual de Reunião (colar link)
 * continua existindo sem mudanças; este é um caminho alternativo, não substitui nada.
 */
export function NewZoomMeetingForm({
  onCreate,
  isCreating,
}: {
  onCreate: (input: { title: string; startAt: string; endAt: string }) => Promise<unknown>;
  isCreating: boolean;
}) {
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !startAt || !endAt) return;
    setError(null);
    try {
      await onCreate({
        title: title.trim(),
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
      });
      setTitle("");
      setStartAt("");
      setEndAt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar a reunião no Zoom.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="qv-card p-3.5 flex flex-col gap-2.5">
      <div className="flex gap-2.5 flex-wrap">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nova reunião no Zoom — título"
          aria-label="Título da reunião"
          className="qv-field flex-1 basis-[220px]"
        />
        <input
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          aria-label="Início"
          className="qv-field w-auto font-mono text-[13px] text-text-secondary"
        />
        <input
          type="datetime-local"
          value={endAt}
          onChange={(e) => setEndAt(e.target.value)}
          aria-label="Fim"
          className="qv-field w-auto font-mono text-[13px] text-text-secondary"
        />
        <Button type="submit" variant="primary" disabled={isCreating} className="px-5">
          {isCreating ? "Criando..." : "Nova reunião Zoom"}
        </Button>
      </div>
      {error && <p className="text-[13px] text-error">{error}</p>}
    </form>
  );
}

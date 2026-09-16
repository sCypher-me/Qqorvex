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
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-center">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título da reunião"
        className="flex-1 min-w-[160px] rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
      />
      <input
        type="datetime-local"
        value={startAt}
        onChange={(e) => setStartAt(e.target.value)}
        className="rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
      />
      <input
        type="datetime-local"
        value={endAt}
        onChange={(e) => setEndAt(e.target.value)}
        className="rounded-md border border-border bg-surface-1 px-2 py-1 text-text-primary text-sm"
      />
      <Button type="submit" variant="secondary" disabled={isCreating}>
        {isCreating ? "Criando..." : "Nova reunião Zoom"}
      </Button>
      {error && <p className="w-full text-sm text-error">{error}</p>}
    </form>
  );
}

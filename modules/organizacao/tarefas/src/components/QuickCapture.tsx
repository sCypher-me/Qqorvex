import { useState, type FormEvent } from "react";
import { Button } from "@qqorvex/ui";

/**
 * "Para captura rápida, somente o título precisa ser obrigatório." A tarefa pode ser
 * organizada depois com prazo, prioridade, projeto, tags e demais campos.
 */
export function QuickCapture({ onCapture }: { onCapture: (title: string) => void }) {
  const [title, setTitle] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onCapture(trimmed);
    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="O que precisa ser feito?"
        className="flex-1 rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
      />
      <Button type="submit" variant="primary">
        Adicionar
      </Button>
    </form>
  );
}

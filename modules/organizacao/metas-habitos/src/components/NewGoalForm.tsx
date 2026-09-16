import { useState, type FormEvent } from "react";
import { Button } from "@qqorvex/ui";

/**
 * "Campo mínimo obrigatório: Título." Prazo/categoria/etc. ficam para depois.
 */
export function NewGoalForm({ onCreate }: { onCreate: (title: string) => void }) {
  const [title, setTitle] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Qual resultado você quer alcançar?"
        className="flex-1 rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
      />
      <Button type="submit" variant="primary">
        Criar meta
      </Button>
    </form>
  );
}

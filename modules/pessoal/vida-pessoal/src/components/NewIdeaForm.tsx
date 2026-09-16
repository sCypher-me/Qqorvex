import { useState, type FormEvent } from "react";
import { Button } from "@qqorvex/ui";
import type { NewIdeaInput } from "../types";

/** Caixa de captura simples — sem status/categoria, de propósito. */
export function NewIdeaForm({ onCreate }: { onCreate: (input: NewIdeaInput) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onCreate({ title: trimmed, description: description.trim() || undefined });
    setTitle("");
    setDescription("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Sua ideia"
        className="rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
      />
      <div className="flex gap-2">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhes (opcional)"
          className="flex-1 rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
        />
        <Button type="submit" variant="primary">
          Capturar ideia
        </Button>
      </div>
    </form>
  );
}

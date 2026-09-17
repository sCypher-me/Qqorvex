import { useState, type FormEvent } from "react";
import { Button, Input } from "@qqorvex/ui";
import type { NewIdeaInput } from "../types";

/** Caixa de captura simples — sem status/categoria, de propósito. */
export function NewIdeaForm({ onCreate, onCancel }: { onCreate: (input: NewIdeaInput) => void; onCancel?: () => void }) {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input label="Sua ideia" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que passou pela cabeça?" autoFocus />
      <Input
        label="Detalhes (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Contexto, links, próximos passos"
      />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm">
          Capturar ideia
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

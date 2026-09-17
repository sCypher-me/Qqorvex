import { useState, type FormEvent } from "react";
import { Button, Input } from "@qqorvex/ui";

/**
 * "Campo mínimo obrigatório: Título." Prazo/categoria/etc. ficam para depois.
 */
export function NewGoalForm({ onCreate, onCancel }: { onCreate: (title: string) => void; onCancel?: () => void }) {
  const [title, setTitle] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Título"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Qual resultado você quer alcançar?"
        autoFocus
      />
      <div className="flex gap-2.5 justify-end flex-wrap">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={!title.trim()}>
          Criar meta
        </Button>
      </div>
    </form>
  );
}

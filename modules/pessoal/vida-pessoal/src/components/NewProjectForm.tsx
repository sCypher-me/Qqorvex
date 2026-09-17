import { useState, type FormEvent } from "react";
import { Button, Input } from "@qqorvex/ui";

/** "Campo mínimo obrigatório: Título." Descrição fica para depois, se fizer falta. */
export function NewProjectForm({ onCreate, onCancel }: { onCreate: (title: string) => void; onCancel?: () => void }) {
  const [title, setTitle] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input label="Nome do projeto" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Reforma do escritório" autoFocus />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm">
          Criar projeto
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

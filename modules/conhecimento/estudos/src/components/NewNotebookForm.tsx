import { useState, type FormEvent } from "react";
import { Button } from "@qqorvex/ui";

export function NewNotebookForm({ onCreate }: { onCreate: (name: string) => void }) {
  const [name, setName] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do Caderno (matéria, curso, prova...)"
        className="flex-1 rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
      />
      <Button type="submit" variant="primary">
        Criar Caderno
      </Button>
    </form>
  );
}

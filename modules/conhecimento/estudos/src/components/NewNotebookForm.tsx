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
    <form onSubmit={handleSubmit} className="flex gap-2.5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do novo caderno"
        aria-label="Nome do novo caderno"
        className="qv-field flex-1 max-w-[420px]"
      />
      <Button type="submit" variant="primary" className="px-5">
        Criar caderno
      </Button>
    </form>
  );
}

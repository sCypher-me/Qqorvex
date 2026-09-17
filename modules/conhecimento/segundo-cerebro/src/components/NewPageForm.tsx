import { useState, type FormEvent } from "react";
import { Button } from "@qqorvex/ui";

export function NewPageForm({ onCreate }: { onCreate: (title: string) => void }) {
  const [title, setTitle] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 min-w-[280px] items-center gap-[10px]">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título da nova página"
        aria-label="Título da nova página"
        className="qv-field flex-1 max-w-[420px] bg-surface-2"
      />
      <Button type="submit" variant="primary">
        Criar página
      </Button>
    </form>
  );
}

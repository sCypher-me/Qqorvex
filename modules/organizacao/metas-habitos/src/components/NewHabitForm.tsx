import { useState, type FormEvent } from "react";
import { Button, Input } from "@qqorvex/ui";

/** "Campo mínimo: Nome." Frequência/horário/etc. ficam para depois. */
export function NewHabitForm({ onCreate, onCancel }: { onCreate: (name: string) => void; onCancel?: () => void }) {
  const [name, setName] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Que comportamento você quer manter?"
        autoFocus
      />
      <div className="flex gap-2.5 justify-end flex-wrap">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={!name.trim()}>
          Criar hábito
        </Button>
      </div>
    </form>
  );
}

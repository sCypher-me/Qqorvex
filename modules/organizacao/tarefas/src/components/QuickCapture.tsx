import { useState, type FormEvent, type Ref } from "react";
import { Button } from "@qqorvex/ui";

/**
 * "Para captura rápida, somente o título precisa ser obrigatório." A tarefa pode ser
 * organizada depois com prazo, prioridade, projeto, tags e demais campos.
 */
export function QuickCapture({
  onCapture,
  inputRef,
}: {
  onCapture: (title: string) => void;
  /** Permite que outro controle (ex.: "Adicionar" do Kanban) leve o foco até a captura. */
  inputRef?: Ref<HTMLInputElement>;
}) {
  const [title, setTitle] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onCapture(trimmed);
    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2.5">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Captura rápida — escreva e pressione Enter"
        aria-label="Captura rápida de tarefa"
        className="qv-field flex-1 max-w-[520px] bg-vex-graphite border-border py-3 px-[14px]"
      />
      <Button type="submit" variant="primary" className="px-5">
        Capturar
      </Button>
    </form>
  );
}

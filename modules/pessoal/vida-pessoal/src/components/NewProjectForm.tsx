import { useState, type FormEvent } from "react";
import { Button, Input } from "@qqorvex/ui";
import type { NewProjectInput } from "../types";

/** Projeto agrupa tarefas já existentes; título é obrigatório e contexto é opcional. */
export function NewProjectForm({ onCreate, onCancel }: { onCreate: (input: NewProjectInput) => void | Promise<void>; onCancel?: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || isSaving) return;
    setIsSaving(true);
    setError(false);
    try {
      await onCreate({ title: trimmed, description: description.trim() || undefined });
      setTitle("");
      setDescription("");
    } catch {
      setError(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input label="Nome do projeto" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Reforma do escritório" autoFocus />
      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value.slice(0, 1000))}
        maxLength={1000}
        aria-label="Descrição opcional do projeto"
        placeholder="Contexto, resultado ou próximos passos (opcional)"
        className="qv-field min-h-20 resize-y"
      />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={!title.trim() || isSaving}>
          {isSaving ? "Criando…" : "Criar projeto"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-error" role="alert">Não foi possível criar o projeto. Seus dados foram mantidos; tente novamente.</p>}
    </form>
  );
}

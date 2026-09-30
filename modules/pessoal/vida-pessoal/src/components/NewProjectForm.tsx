import { useState, type FormEvent } from "react";
import { Button, Input, Textarea } from "@qqorvex/ui";
import type { NewProjectInput, Project } from "../types";

/** Projeto agrupa tarefas já existentes; título é obrigatório e contexto é opcional. Com `initial`, edita. */
export function NewProjectForm({ initial, onSubmit, onCancel }: { initial?: Project; onSubmit: (input: NewProjectInput) => void | Promise<void>; onCancel?: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || isSaving) return;
    setIsSaving(true);
    setError(false);
    try {
      await onSubmit({ title: trimmed, description: description.trim() || undefined });
      if (!initial) {
        setTitle("");
        setDescription("");
      }
    } catch {
      setError(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Nome do projeto" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Reforma do escritório" autoFocus />
      <Textarea
        label="Descrição"
        value={description}
        onChange={(event) => setDescription(event.target.value.slice(0, 1000))}
        maxLength={1000}
        placeholder="Contexto, resultado ou próximos passos (opcional)"
        rows={3}
      />
      {error && <p className="text-xs text-danger" role="alert">Não foi possível salvar o projeto. Seus dados foram mantidos; tente novamente.</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="primary" loading={isSaving} disabled={!title.trim()}>
          {initial ? "Salvar alterações" : "Criar projeto"}
        </Button>
      </div>
    </form>
  );
}

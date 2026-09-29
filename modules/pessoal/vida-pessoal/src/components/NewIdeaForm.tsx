import { useState, type FormEvent } from "react";
import { Button, Input, Textarea } from "@qqorvex/ui";
import type { Idea, NewIdeaInput } from "../types";

/** Caixa de captura simples — sem status/categoria, de propósito. Com `initial`, edita a ideia. */
export function NewIdeaForm({ initial, onSubmit, onCancel }: { initial?: Idea; onSubmit: (input: NewIdeaInput) => void | Promise<void>; onCancel?: () => void }) {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input label="Sua ideia" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que passou pela cabeça?" autoFocus />
      <Textarea
        label="Detalhes (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Contexto, links, próximos passos"
        rows={3}
      />
      {error && <p className="text-xs text-danger" role="alert">Não foi possível salvar a ideia. Seus dados foram mantidos; tente novamente.</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="primary" loading={isSaving} disabled={!title.trim()}>
          {initial ? "Salvar alterações" : "Capturar ideia"}
        </Button>
      </div>
    </form>
  );
}

import { useState, type FormEvent, type Ref } from "react";
import { Button, PlusIcon } from "@qqorvex/ui";
import type { NewTaskInput, TaskPriority } from "../types";

/**
 * "Para captura rápida, somente o título precisa ser obrigatório." A tarefa pode ser
 * organizada depois com prazo, prioridade, projeto, tags e demais campos.
 */
export function QuickCapture({
  onCapture,
  inputRef,
  onPlan,
  isSaving = false,
}: {
  onCapture: (input: NewTaskInput) => Promise<void>;
  /** Permite que outro controle (ex.: "Adicionar" do Kanban) leve o foco até a captura. */
  inputRef?: Ref<HTMLInputElement>;
  onPlan?: () => void;
  isSaving?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [priority, setPriority] = useState<TaskPriority>("sem_prioridade");
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || isSaving || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCapture({
        title: trimmed,
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        startDate: startDate || undefined,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      });
      setTitle("");
      setDescription("");
      setPriority("sem_prioridade");
      setDueDate("");
      setStartDate("");
      setEstimatedMinutes("");
      setTags("");
    } catch {
      // Keep the draft in place so a transient connection error does not erase the user's work.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="editorial-capture flex flex-wrap items-center gap-2.5">
      <div className="editorial-capture-main flex min-w-0 flex-1 basis-[420px] items-center gap-2">
        <PlusIcon size={20} className="shrink-0 text-text-muted" aria-hidden="true" />
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Capture uma tarefa rápida..."
          aria-label="Captura rápida de tarefa"
          className="editorial-capture-input min-w-0 flex-1"
        />
        <Button
          type="button"
          variant={showDetails ? "vex" : "quiet"}
          size="sm"
          onClick={() => setShowDetails((value) => !value)}
          aria-expanded={showDetails}
          title="Adicionar prazo e prioridade"
          className="shrink-0"
        >
          {showDetails ? "Menos detalhes" : "Detalhes"}
        </Button>
      </div>
      {onPlan && <Button type="button" variant="secondary" onClick={onPlan}>Planejar tarefa</Button>}
      <Button type="submit" variant="primary" className="px-5" disabled={!title.trim() || isSaving || isSubmitting}>
        {isSaving || isSubmitting ? "Salvando…" : "Adicionar"}
      </Button>
      {showDetails && (
        <div className="grid w-full grid-cols-1 gap-3 rounded-[14px] border border-border bg-surface-1/70 p-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className="flex min-w-0 flex-col gap-1.5 text-[11px] text-text-muted sm:col-span-2 xl:col-span-3">
            <span>Contexto e critério de conclusão</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que precisa acontecer para considerar esta tarefa concluída?" rows={2} className="qv-field resize-y py-2.5 text-[13px]" />
          </label>
          <label className="flex min-w-[180px] flex-1 items-center gap-2 text-[11px] text-text-muted">
            <span className="sr-only">Prioridade</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              aria-label="Prioridade da nova tarefa"
              className="qv-field py-2.5 text-[13px]"
            >
              <option value="sem_prioridade">Sem prioridade</option>
              <option value="baixa">Prioridade baixa</option>
              <option value="media">Prioridade média</option>
              <option value="alta">Alta prioridade</option>
            </select>
          </label>
          <label className="flex min-w-[180px] flex-1 items-center gap-2 text-[11px] text-text-muted">
            <span className="sr-only">Prazo</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              aria-label="Prazo da nova tarefa"
              className="qv-field py-2.5 font-mono text-[13px]"
            />
          </label>
          <label className="flex min-w-[180px] flex-1 items-center gap-2 text-[11px] text-text-muted">
            <span className="sr-only">Começa em</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} aria-label="Data de início da tarefa" className="qv-field py-2.5 font-mono text-[13px]" />
          </label>
          <label className="flex min-w-[150px] flex-1 items-center gap-2 text-[11px] text-text-muted">
            <span className="sr-only">Tempo estimado em minutos</span>
            <input type="number" min="1" max="1440" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} aria-label="Tempo estimado em minutos" placeholder="Estimativa (min)" className="qv-field py-2.5 text-[13px]" />
          </label>
          <label className="flex min-w-[180px] flex-1 items-center gap-2 text-[11px] text-text-muted sm:col-span-2 xl:col-span-3">
            <span className="sr-only">Tags separadas por vírgula</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} aria-label="Tags separadas por vírgula" placeholder="Tags para organizar — separadas por vírgula" className="qv-field py-2.5 text-[13px]" />
          </label>
          <span className="text-[11px] text-text-muted sm:col-span-2 xl:col-span-3">Depois você pode abrir a tarefa para adicionar checklist e pré-requisitos.</span>
        </div>
      )}
    </form>
  );
}

import { useState, type FormEvent } from "react";
import { Button, Input } from "@qqorvex/ui";
import { billingLimitMessage } from "@qqorvex/database";
import type { NewGoalInput } from "../types";
import { localDateKey } from "../service";

const PROGRESS_OPTIONS = [
  { value: "marcos", label: "Por marcos", hint: "Divida o resultado em etapas menores." },
  { value: "binario", label: "Concluir ou não", hint: "Acompanhe uma meta sem percentual." },
] as const;

export function NewGoalForm({
  onCreate,
  onCancel,
}: {
  onCreate: (goal: NewGoalInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [motivationNote, setMotivationNote] = useState("");
  const [status, setStatus] = useState<"ativa" | "planejada">("ativa");
  const [progressType, setProgressType] = useState<"marcos" | "binario">("marcos");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await onCreate({
        title: trimmedTitle,
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        dueDate: dueDate || undefined,
        motivationNote: motivationNote.trim() || undefined,
        status,
        progressType,
      });
    } catch (cause) {
      setError(billingLimitMessage(cause) ?? (cause instanceof Error ? cause.message : "Não foi possível salvar a meta. Tente novamente."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="O que você quer alcançar?"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Ex.: montar minha reserva de emergência"
        maxLength={120}
        autoFocus
        required
      />

      <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
        Descrição <span className="text-xs font-normal text-fg-3">opcional</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Por que essa meta importa? Qual resultado você espera?"
          rows={3}
          maxLength={600}
          className="q-input min-h-20 resize-y py-2.5"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Área"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Ex.: saúde, carreira"
          maxLength={40}
        />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
          Prazo <span className="text-xs font-normal text-fg-3">opcional</span>
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            min={localDateKey()}
            className="q-input py-2.5"
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-fg">Como acompanhar</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PROGRESS_OPTIONS.map((option) => (
            <label key={option.value} className={`flex min-w-0 cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${progressType === option.value ? "border-gold-line bg-gold-soft" : "border-line-soft bg-canvas/40 hover:border-line"}`}>
              <input
                type="radio"
                name="goal-progress-type"
                value={option.value}
                checked={progressType === option.value}
                onChange={() => setProgressType(option.value)}
                className="mt-1 accent-[var(--q-gold)]"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-fg">{option.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-fg-3">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {progressType === "marcos" && (
        <p className="-mt-2 text-xs leading-relaxed text-fg-3">Você poderá adicionar etapas logo depois de criar a meta.</p>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
        Situação inicial
        <select value={status} onChange={(event) => setStatus(event.target.value as "ativa" | "planejada")} className="q-input py-2.5">
          <option value="ativa">Começar agora</option>
          <option value="planejada">Deixar planejada</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
        Lembrete pessoal <span className="text-xs font-normal text-fg-3">opcional</span>
        <input
          value={motivationNote}
          onChange={(event) => setMotivationNote(event.target.value)}
          placeholder="O que você quer lembrar nos dias difíceis?"
          maxLength={240}
          className="q-input py-2.5"
        />
      </label>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2.5">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={!title.trim() || isSaving}>
          {isSaving ? "Salvando…" : "Criar meta"}
        </Button>
      </div>
    </form>
  );
}

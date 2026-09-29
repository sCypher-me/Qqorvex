import { useState, type FormEvent } from "react";
import { Button, Input } from "@qqorvex/ui";
import { billingLimitMessage } from "@qqorvex/database";
import type { Habit, HabitFrequencyConfig, HabitFrequencyType, NewHabitInput } from "../types";

const WEEK_DAYS = [
  { value: "mon", label: "Seg" },
  { value: "tue", label: "Ter" },
  { value: "wed", label: "Qua" },
  { value: "thu", label: "Qui" },
  { value: "fri", label: "Sex" },
  { value: "sat", label: "Sáb" },
  { value: "sun", label: "Dom" },
] as const;

const FREQUENCIES: { value: HabitFrequencyType; label: string }[] = [
  { value: "diaria", label: "Todos os dias" },
  { value: "dias_especificos", label: "Dias da semana" },
  { value: "x_vezes_semana", label: "Vezes por semana" },
  { value: "semanal", label: "Uma vez por semana" },
  { value: "mensal", label: "Uma vez por mês" },
];

/** Códigos antigos em português ainda aparecem em hábitos criados antes da troca para inglês. */
const LEGACY_DAY_CODES: Record<string, string> = { dom: "sun", seg: "mon", ter: "tue", qua: "wed", qui: "thu", sex: "fri", sab: "sat" };

/** Cria um hábito ou, com `initial`, edita um existente (mesmos campos). */
export function NewHabitForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Habit;
  onSubmit: (habit: NewHabitInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const initialConfig = (initial?.frequency_config ?? {}) as unknown as HabitFrequencyConfig;
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [preferredTime, setPreferredTime] = useState(initial?.preferred_time?.slice(0, 5) ?? "");
  const [frequencyType, setFrequencyType] = useState<HabitFrequencyType>(initial?.frequency_type ?? "diaria");
  const [days, setDays] = useState<string[]>(() => [...new Set((initialConfig.days ?? []).map((day) => LEGACY_DAY_CODES[day] ?? day))]);
  const [timesPerWeek, setTimesPerWeek] = useState(initialConfig.timesPerWeek ?? 3);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || isSaving) return;
    if (frequencyType === "dias_especificos" && days.length === 0) {
      setError("Escolha pelo menos um dia da semana.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: trimmedName,
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        preferredTime: preferredTime || undefined,
        frequencyType,
        frequencyConfig:
          frequencyType === "dias_especificos"
            ? { days }
            : frequencyType === "x_vezes_semana"
              ? { timesPerWeek }
              : {},
      });
    } catch (cause) {
      setError(billingLimitMessage(cause) ?? (cause instanceof Error ? cause.message : "Não foi possível salvar o hábito. Tente novamente."));
    } finally {
      setIsSaving(false);
    }
  }

  function toggleDay(day: string) {
    setDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Qual comportamento você quer cultivar?"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Ex.: caminhar por 20 minutos"
        maxLength={100}
        autoFocus
        required
      />

      <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
        Descrição <span className="text-xs font-normal text-fg-3">opcional</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Deixe a ação clara e pequena o bastante para caber no seu dia."
          rows={2}
          maxLength={300}
          className="q-input min-h-16 resize-y py-2.5"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
          Frequência
          <select value={frequencyType} onChange={(event) => setFrequencyType(event.target.value as HabitFrequencyType)} className="q-input py-2.5">
            {FREQUENCIES.map((frequency) => <option key={frequency.value} value={frequency.value}>{frequency.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
          Horário sugerido <span className="text-xs font-normal text-fg-3">opcional</span>
          <input type="time" value={preferredTime} onChange={(event) => setPreferredTime(event.target.value)} className="q-input py-2.5" />
        </label>
      </div>

      {frequencyType === "dias_especificos" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-fg">Em quais dias?</legend>
          <div className="flex flex-wrap gap-2">
            {WEEK_DAYS.map((day) => (
              <label key={day.value} className={`min-w-0 rounded-lg border border-line-soft bg-canvas/40 flex min-h-10 cursor-pointer items-center gap-2 px-3 text-sm ${days.includes(day.value) ? "border-gold-line text-fg" : "text-fg-2"}`}>
                <input type="checkbox" checked={days.includes(day.value)} onChange={() => toggleDay(day.value)} className="h-4 w-4 shrink-0 accent-[var(--q-gold)]" />
                {day.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {frequencyType === "x_vezes_semana" && (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
          Meta semanal
          <select value={timesPerWeek} onChange={(event) => setTimesPerWeek(Number(event.target.value))} className="q-input py-2.5">
            {[1, 2, 3, 4, 5, 6, 7].map((count) => <option key={count} value={count}>{count} {count === 1 ? "vez" : "vezes"} por semana</option>)}
          </select>
        </label>
      )}

      <Input
        label="Área"
        value={category}
        onChange={(event) => setCategory(event.target.value)}
        placeholder="Ex.: saúde, estudos"
        maxLength={40}
      />

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2.5">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>Cancelar</Button>}
        <Button type="submit" variant="primary" disabled={!name.trim() || isSaving}>
          {isSaving ? "Salvando…" : initial ? "Salvar alterações" : "Criar hábito"}
        </Button>
      </div>
    </form>
  );
}

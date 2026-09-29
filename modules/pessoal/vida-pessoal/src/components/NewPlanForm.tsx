import { useState, type FormEvent } from "react";
import { Button, Input, Select, Textarea } from "@qqorvex/ui";
import { computePlanPeriod } from "../service";
import type { NewPlanInput, PlanType } from "../types";

const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  mensal: "Mensal",
  anual: "Anual",
  quinquenal: "5 anos",
};

/** A pessoa só escolhe um mês ou ano, nunca duas datas soltas — ver `computePlanPeriod`. */
export function NewPlanForm({ onCreate, onCancel }: { onCreate: (input: NewPlanInput) => void | Promise<void>; onCancel?: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);
  const [planType, setPlanType] = useState<PlanType>("anual");
  const currentYear = new Date().getFullYear();
  const localNow = new Date();
  const [month, setMonth] = useState(`${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, "0")}`);
  const [year, setYear] = useState(currentYear);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || isSaving) return;
    const { periodStart, periodEnd } = computePlanPeriod(planType, { month, year });
    setIsSaving(true);
    setError(false);
    try {
      await onCreate({ title: trimmed, description: description.trim() || undefined, planType, periodStart, periodEnd });
      setTitle("");
      setDescription("");
    } catch {
      setError(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Visão do plano"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ex.: Ser um designer"
        autoFocus
      />
      <Textarea
        label="Descrição"
        value={description}
        onChange={(event) => setDescription(event.target.value.slice(0, 1000))}
        maxLength={1000}
        placeholder="O que essa visão significa para você? (opcional)"
        rows={3}
      />
      <div className="grid grid-cols-2 gap-2.5">
        <Select label="Tipo" value={planType} onChange={(e) => setPlanType(e.target.value as PlanType)}>
          {Object.entries(PLAN_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        {planType === "mensal" ? (
          <Input label="Mês" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        ) : (
          <Input
            label="Ano"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        )}
      </div>
      {error && <p className="text-xs text-danger" role="alert">Não foi possível criar o plano. Seus dados foram mantidos; tente novamente.</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="primary" loading={isSaving} disabled={!title.trim()}>
          Criar plano
        </Button>
      </div>
    </form>
  );
}

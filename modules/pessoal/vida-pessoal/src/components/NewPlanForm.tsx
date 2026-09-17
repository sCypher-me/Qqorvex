import { useState, type FormEvent } from "react";
import { Button, Input, Select } from "@qqorvex/ui";
import { computePlanPeriod } from "../service";
import type { NewPlanInput, PlanType } from "../types";

const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  mensal: "Mensal",
  anual: "Anual",
  quinquenal: "Quinquenal (5 anos)",
};

/** A pessoa só escolhe um mês ou ano, nunca duas datas soltas — ver `computePlanPeriod`. */
export function NewPlanForm({ onCreate, onCancel }: { onCreate: (input: NewPlanInput) => void; onCancel?: () => void }) {
  const [title, setTitle] = useState("");
  const [planType, setPlanType] = useState<PlanType>("anual");
  const currentYear = new Date().getFullYear();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [year, setYear] = useState(currentYear);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    const { periodStart, periodEnd } = computePlanPeriod(planType, { month, year });
    onCreate({ title: trimmed, planType, periodStart, periodEnd });
    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        label="Visão do plano"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ex.: Ser um designer"
        autoFocus
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
          <Input label="Mês" type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="font-mono" />
        ) : (
          <Input
            label="Ano"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="font-mono"
          />
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm">
          Criar plano
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

import { useState, type FormEvent } from "react";
import { Button } from "@qqorvex/ui";
import { computePlanPeriod } from "../service";
import type { NewPlanInput, PlanType } from "../types";

const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  mensal: "Mensal",
  anual: "Anual",
  quinquenal: "Quinquenal (5 anos)",
};

/** A pessoa só escolhe um mês ou ano, nunca duas datas soltas — ver `computePlanPeriod`. */
export function NewPlanForm({ onCreate }: { onCreate: (input: NewPlanInput) => void }) {
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
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-center">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Qual a visão desse plano? Ex.: Ser um designer"
        className="flex-1 min-w-[200px] rounded-md border border-border bg-surface-1 px-3 py-2 text-text-primary outline-none focus:border-brand-cyan"
      />
      <select
        value={planType}
        onChange={(e) => setPlanType(e.target.value as PlanType)}
        className="rounded-md border border-border bg-surface-1 px-2 py-2 text-text-primary text-sm"
      >
        {Object.entries(PLAN_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {planType === "mensal" ? (
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-border bg-surface-1 px-2 py-2 text-text-primary text-sm"
        />
      ) : (
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-24 rounded-md border border-border bg-surface-1 px-2 py-2 text-text-primary text-sm"
        />
      )}
      <Button type="submit" variant="primary">
        Criar plano
      </Button>
    </form>
  );
}

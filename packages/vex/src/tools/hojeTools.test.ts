import { describe, expect, it } from "vitest";
import type { Task } from "@qqorvex/module-tarefas";
import { describeDayPlan, planForDate } from "./hojeTools";

const window = { start: "08:00", end: "21:00" };

function task(overrides: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    status: "nao_iniciado",
    priority: "media",
    due_date: "2026-10-10",
    start_date: null,
    estimated_minutes: null,
    created_at: "2026-10-01T10:00:00Z",
    completed_at: null,
    ...overrides,
  } as Task;
}

describe("plano do dia para a Vex", () => {
  it("usa as mesmas tarefas e a mesma ordem da tela Hoje, com ids para a Vex propor ajustes", () => {
    const tasks = [
      task({ id: "t-baixa", title: "Organizar fotos", priority: "baixa", estimated_minutes: 30 }),
      task({ id: "t-alta", title: "Enviar relatório", priority: "alta", estimated_minutes: 60 }),
      task({ id: "t-amanha", title: "Prova", due_date: "2026-10-11" }),
      task({ id: "t-feita", title: "Feita", status: "concluido" }),
    ];
    const plan = planForDate(tasks, [], "2026-10-10", "2026-10-10", window, new Date(2026, 9, 10, 9, 0));
    const text = describeDayPlan(plan, window);

    expect(plan.entries.filter((entry) => entry.kind === "task").map((entry) => entry.id)).toEqual(["t-alta", "t-baixa"]);
    expect(text).toContain("disponível 08:00–21:00");
    expect(text).toContain("09:00–10:00 · tarefa: Enviar relatório (1h) [id: t-alta]");
    expect(text).not.toContain("Prova");
    expect(text).toContain("Tudo o que vence hoje cabe");
  });

  it("planeja um dia futuro a partir do início do horário disponível e respeita compromissos", () => {
    const plan = planForDate(
      [task({ id: "t1", title: "Estudar", due_date: "2026-10-12", estimated_minutes: 60 })],
      [{ id: "e1", title: "Consulta", start_at: new Date(2026, 9, 12, 8, 0).toISOString(), end_at: new Date(2026, 9, 12, 9, 0).toISOString(), is_all_day: false }],
      "2026-10-12",
      "2026-10-10",
      window,
    );
    const text = describeDayPlan(plan, window);
    expect(text).toContain("08:00–09:00 · compromisso: Consulta");
    expect(text).toContain("09:00–10:00 · tarefa: Estudar");
  });

  it("diz o que ficou de fora quando o dia não fecha, sem mudar nada", () => {
    const plan = planForDate(
      [task({ id: "t1", title: "Apresentação", estimated_minutes: 180 })],
      [],
      "2026-10-10",
      "2026-10-10",
      window,
      new Date(2026, 9, 10, 19, 30),
    );
    const text = describeDayPlan(plan, window);
    expect(text).toContain("Não cabe tudo");
    expect(text).toContain('"Apresentação" (3h) [id: t1]');
    expect(text).toContain("nada muda sem confirmação");
  });
});

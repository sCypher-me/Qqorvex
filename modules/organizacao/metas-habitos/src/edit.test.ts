import { describe, expect, it } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";
import { deleteMilestone, updateGoal, updateHabit, updateMilestone } from "./repository";
import { toGoalUpdate, toHabitUpdate } from "./types";

/** Cliente falso que registra a cadeia de chamadas montada pela consulta. */
function recordingClient(row: unknown = { id: "x" }) {
  const calls: Array<[string, ...unknown[]]> = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["update", "delete", "eq", "select", "single"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => void) => resolve({ data: row, error: null });
  const client = {
    from: (table: string) => {
      calls.push(["from", table]);
      return builder;
    },
  } as unknown as SupabaseClient<Database>;
  return { client, calls };
}

describe("toGoalUpdate", () => {
  it("grava só os campos editáveis e limpa os opcionais deixados em branco", () => {
    expect(toGoalUpdate({ title: "Reserva", category: "finanças" })).toEqual({
      title: "Reserva",
      description: null,
      due_date: null,
      category: "finanças",
      motivation_note: null,
    });
  });

  it("nunca mexe em status nem na forma de progresso (têm fluxos próprios)", () => {
    const update = toGoalUpdate({ title: "Correr 10 km", dueDate: "2026-12-01" });
    expect(update).not.toHaveProperty("status");
    expect(update).not.toHaveProperty("progress_type");
    expect(update).not.toHaveProperty("progress_source_account_id");
    expect(update.due_date).toBe("2026-12-01");
  });
});

describe("toHabitUpdate", () => {
  it("troca a frequência e a configuração juntas", () => {
    expect(toHabitUpdate({ name: "Ler", frequencyType: "x_vezes_semana", frequencyConfig: { timesPerWeek: 4 } })).toEqual({
      name: "Ler",
      description: null,
      frequency_type: "x_vezes_semana",
      frequency_config: { timesPerWeek: 4 },
      preferred_time: null,
      category: null,
    });
  });

  it("sem frequência informada volta para diária com configuração vazia", () => {
    const update = toHabitUpdate({ name: "Beber água", preferredTime: "08:00" });
    expect(update.frequency_type).toBe("diaria");
    expect(update.frequency_config).toEqual({});
    expect(update.preferred_time).toBe("08:00");
  });
});

describe("edição no repositório", () => {
  it("updateGoal atualiza a meta certa com o mapeamento de edição", async () => {
    const { client, calls } = recordingClient();
    await updateGoal(client, "goal-1", { title: "Nova meta" });
    expect(calls).toContainEqual(["from", "goals"]);
    expect(calls).toContainEqual(["update", toGoalUpdate({ title: "Nova meta" })]);
    expect(calls).toContainEqual(["eq", "id", "goal-1"]);
  });

  it("updateHabit atualiza o hábito certo com o mapeamento de edição", async () => {
    const { client, calls } = recordingClient();
    await updateHabit(client, "habit-1", { name: "Meditar" });
    expect(calls).toContainEqual(["from", "habits"]);
    expect(calls).toContainEqual(["update", toHabitUpdate({ name: "Meditar" })]);
    expect(calls).toContainEqual(["eq", "id", "habit-1"]);
  });

  it("updateMilestone muda só o título do marco", async () => {
    const { client, calls } = recordingClient();
    await updateMilestone(client, "m-1", "Juntar R$ 1.000");
    expect(calls).toContainEqual(["from", "goal_milestones"]);
    expect(calls).toContainEqual(["update", { title: "Juntar R$ 1.000" }]);
    expect(calls).toContainEqual(["eq", "id", "m-1"]);
  });

  it("deleteMilestone apaga só o marco pedido", async () => {
    const { client, calls } = recordingClient(null);
    await deleteMilestone(client, "m-2");
    expect(calls).toContainEqual(["from", "goal_milestones"]);
    expect(calls).toContainEqual(["delete"]);
    expect(calls).toContainEqual(["eq", "id", "m-2"]);
  });
});

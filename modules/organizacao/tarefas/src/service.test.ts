import { describe, expect, it, vi } from "vitest";
import { computeNextTaskOccurrenceDate, deriveTaskConditions, wouldCreateCycle } from "./service";
import type { Task } from "./types";

function task(overrides: Partial<Task>): Task {
  return { status: "nao_iniciado", due_date: null, is_cancelled: false, ...overrides } as Task;
}

describe("deriveTaskConditions", () => {
  it("marca como atrasada só quando due_date passou, não concluída e não cancelada", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T12:00:00"));

    const [overdue, doneButLate, cancelledButLate, notYetDue] = deriveTaskConditions(
      [
        task({ id: "1", due_date: "2026-09-01" }),
        task({ id: "2", due_date: "2026-09-01", status: "concluido" }),
        task({ id: "3", due_date: "2026-09-01", is_cancelled: true }),
        task({ id: "4", due_date: "2026-09-20" }),
      ] as Task[],
      [],
    );
    expect(overdue!.isOverdue).toBe(true);
    expect(doneButLate!.isOverdue).toBe(false);
    expect(cancelledButLate!.isOverdue).toBe(false);
    expect(notYetDue!.isOverdue).toBe(false);

    vi.useRealTimers();
  });

  it("marca como bloqueada quando depende de uma tarefa não concluída, livre quando a dependência já concluiu", () => {
    const result = deriveTaskConditions(
      [
        task({ id: "a", status: "nao_iniciado" }),
        task({ id: "b", status: "concluido" }),
        task({ id: "c" }), // depende de "a" (não concluída)
        task({ id: "d" }), // depende de "b" (já concluída)
      ] as Task[],
      [
        { task_id: "c", depends_on_task_id: "a" },
        { task_id: "d", depends_on_task_id: "b" },
      ],
    );
    const byId = new Map(result.map((t) => [t.id, t]));
    expect(byId.get("c")!.isBlocked).toBe(true);
    expect(byId.get("d")!.isBlocked).toBe(false);
  });

  it("não fica bloqueada quando a dependência já está concluída", () => {
    const [, dependent] = deriveTaskConditions(
      [task({ id: "a", status: "concluido" }), task({ id: "b" })] as Task[],
      [{ task_id: "b", depends_on_task_id: "a" }],
    );
    expect(dependent!.isBlocked).toBe(false);
  });
});

describe("wouldCreateCycle", () => {
  it("uma tarefa não pode depender de si mesma", () => {
    expect(wouldCreateCycle([], "a", "a")).toBe(true);
  });

  it("detecta ciclo indireto (a→b→c, adicionar c→a fecharia o ciclo)", () => {
    const edges = [
      { task_id: "a", depends_on_task_id: "b" },
      { task_id: "b", depends_on_task_id: "c" },
    ];
    expect(wouldCreateCycle(edges, "c", "a")).toBe(true);
  });

  it("dependência nova sem relação com o grafo existente não cria ciclo", () => {
    const edges = [{ task_id: "a", depends_on_task_id: "b" }];
    expect(wouldCreateCycle(edges, "x", "y")).toBe(false);
  });
});

describe("computeNextTaskOccurrenceDate", () => {
  it("avança pela frequência (diária/semanal/mensal)", () => {
    expect(computeNextTaskOccurrenceDate("2026-09-15", "diaria")).toBe("2026-09-16");
    expect(computeNextTaskOccurrenceDate("2026-09-15", "semanal")).toBe("2026-09-22");
    expect(computeNextTaskOccurrenceDate("2026-09-15", "mensal")).toBe("2026-10-15");
  });

  it("mensal em dezembro vira o ano", () => {
    expect(computeNextTaskOccurrenceDate("2026-12-15", "mensal")).toBe("2027-01-15");
  });
});

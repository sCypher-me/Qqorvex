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

import { compareTasksForAction, dueBucketOf, formatDueLabel, parseQuickTask } from "./service";

describe("parseQuickTask", () => {
  const today = "2026-09-29"; // terça-feira

  it("reconhece data relativa, prioridade e tags e limpa o título", () => {
    const parsed = parseQuickTask("Pagar conta de luz amanhã !alta #casa #Contas", today);
    expect(parsed.title).toBe("Pagar conta de luz");
    expect(parsed.dueDate).toBe("2026-09-30");
    expect(parsed.priority).toBe("alta");
    expect(parsed.tags).toEqual(["casa", "contas"]);
  });

  it("entende dias da semana a partir de hoje", () => {
    expect(parseQuickTask("Reunião sexta", today).dueDate).toBe("2026-10-02");
    expect(parseQuickTask("Ligar na terça", today).dueDate).toBe(today);
    expect(parseQuickTask("Ligar na próxima terça", today).dueDate).toBe("2026-10-06");
  });

  it("entende datas numéricas, 'dia N' e 'em N dias'", () => {
    expect(parseQuickTask("Entregar relatório 15/10", today).dueDate).toBe("2026-10-15");
    expect(parseQuickTask("Renovar CNH 10/01", today).dueDate).toBe("2027-01-10");
    expect(parseQuickTask("Pagar aluguel dia 5", today).dueDate).toBe("2026-10-05");
    expect(parseQuickTask("Revisar em 3 dias", today).dueDate).toBe("2026-10-02");
    expect(parseQuickTask("Planejar semana que vem", today).dueDate).toBe("2026-10-06");
  });

  it("mantém o texto quando nada é reconhecido", () => {
    const parsed = parseQuickTask("Comprar 2 kg de café", today);
    expect(parsed).toMatchObject({ title: "Comprar 2 kg de café", tags: [], dueDate: undefined, priority: undefined });
  });
});

describe("agrupamento por prazo", () => {
  const today = "2026-09-29";
  it("classifica prazos em faixas", () => {
    expect(dueBucketOf("2026-09-20", today)).toBe("atrasadas");
    expect(dueBucketOf(today, today)).toBe("hoje");
    expect(dueBucketOf("2026-09-30", today)).toBe("amanha");
    expect(dueBucketOf("2026-10-04", today)).toBe("semana");
    expect(dueBucketOf("2026-11-01", today)).toBe("depois");
    expect(dueBucketOf(null, today)).toBe("sem_prazo");
  });

  it("ordena por prazo e depois prioridade", () => {
    const base = { created_at: "2026-09-01" } as Task;
    const tasks = [
      { ...base, id: "a", due_date: null, priority: "alta" },
      { ...base, id: "b", due_date: "2026-10-01", priority: "baixa" },
      { ...base, id: "c", due_date: "2026-10-01", priority: "alta" },
    ] as Task[];
    expect([...tasks].sort(compareTasksForAction).map((t) => t.id)).toEqual(["c", "b", "a"]);
  });

  it("formata rótulos curtos de prazo", () => {
    expect(formatDueLabel(today, today)).toBe("Hoje");
    expect(formatDueLabel("2026-09-30", today)).toBe("Amanhã");
    expect(formatDueLabel("2026-09-28", today)).toBe("Ontem");
  });
});

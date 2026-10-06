import { describe, expect, it } from "vitest";
import { latestVexRequestHasCompletedAction, prepareVexRetryHistory, type RetryHistoryEntry } from "./retryHistory";

describe("retry da última solicitação à Vex", () => {
  it("repete o pedido original sem levar junto uma resposta de fallback enganosa", () => {
    const history: RetryHistoryEntry[] = [
      { id: "u1", role: "user", content: "Crie o quiz" },
      { id: "a1", role: "assistant", content: "Quiz criado!" },
    ];
    expect(prepareVexRetryHistory(history, "u2")).toEqual([{ id: "u2", role: "user", content: "Crie o quiz" }]);
  });

  it("mantém o histórico anterior, mas remove a tentativa que falhou", () => {
    const history: RetryHistoryEntry[] = [
      { id: "u1", role: "user", content: "Oi" },
      { id: "a1", role: "assistant", content: "Olá" },
      { id: "u2", role: "user", content: "Crie flashcards" },
      { id: "x1", role: "action", status: "failed" },
      { id: "a2", role: "assistant", content: "Falhou" },
    ];
    expect(prepareVexRetryHistory(history, "u3")).toEqual([
      history[0], history[1],
      { id: "u3", role: "user", content: "Crie flashcards" },
    ]);
  });

  it("não oferece repetição de uma ação já concluída", () => {
    expect(latestVexRequestHasCompletedAction([
      { id: "u1", role: "user", content: "Criar tarefa" },
      { id: "x1", role: "action", status: "done" },
      { id: "a1", role: "assistant", content: "Pronto" },
    ])).toBe(true);
    expect(latestVexRequestHasCompletedAction([
      { id: "u1", role: "user", content: "Criar tarefa" },
      { id: "a1", role: "assistant", content: "Pronto", completedAction: true },
    ])).toBe(true);
    expect(latestVexRequestHasCompletedAction([{ id: "u1", role: "user", content: "Criar tarefa" }])).toBe(false);
  });
});

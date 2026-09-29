import { describe, expect, it } from "vitest";
import { MAX_VEX_CONTEXT_CHARS, MAX_VEX_CONTEXT_MESSAGES, buildVexContext, trimVexContext } from "./context";
import type { ChatMessage } from "../types";

describe("trimVexContext", () => {
  it("preserva instruções do sistema e prioriza as mensagens mais recentes", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "regras" },
      ...Array.from({ length: MAX_VEX_CONTEXT_MESSAGES + 4 }, (_, index) => ({
        role: index % 2 === 0 ? "user" : "assistant",
        content: `mensagem ${index}`,
      }) as ChatMessage),
    ];

    const result = trimVexContext(messages);

    expect(result[0]).toEqual({ role: "system", content: "regras" });
    expect(result).toHaveLength(MAX_VEX_CONTEXT_MESSAGES + 1);
    expect(result.at(-1)?.content).toBe(`mensagem ${MAX_VEX_CONTEXT_MESSAGES + 3}`);
    expect(result.some((message) => message.content === "mensagem 0")).toBe(false);
  });

  it("não excede o orçamento de caracteres quando há uma mensagem muito grande", () => {
    const result = trimVexContext([
      { role: "system", content: "regras" },
      { role: "user", content: "a".repeat(MAX_VEX_CONTEXT_CHARS) },
      { role: "assistant", content: "resposta recente" },
    ]);

    expect(result.map((message) => message.content)).toEqual(["regras", "resposta recente"]);
    expect(result.reduce((total, message) => total + message.content.length, 0)).toBeLessThanOrEqual(MAX_VEX_CONTEXT_CHARS);
  });
});

describe("buildVexContext", () => {
  it("informa data, hora e os próximos dias com o dia da semana", () => {
    const [message] = buildVexContext({ now: new Date(2026, 8, 29, 14, 5), timeZone: "America/Sao_Paulo", userName: "Ana" });
    expect(message?.role).toBe("system");
    expect(message?.content).toContain("terça-feira, 29 de setembro de 2026, 14:05");
    expect(message?.content).toContain("hoje = 2026-09-29");
    expect(message?.content).toContain("amanhã = 2026-09-30");
    expect(message?.content).toContain("sexta-feira = 2026-10-02");
    expect(message?.content).toContain("Ana");
  });

  it("descreve a tela e o item em foco", () => {
    const [message] = buildVexContext({
      now: new Date(2026, 0, 1, 9, 0),
      page: { title: "Tarefas", subtitle: "Planejar" },
      currentItem: { type: "tarefa", id: "t1", label: "Pagar IPVA" },
    });
    expect(message?.content).toContain('Tela aberta agora: "Tarefas" (Planejar)');
    expect(message?.content).toContain('a Tarefa "Pagar IPVA" (id: t1)');
  });
});

import { describe, expect, it } from "vitest";
import { MAX_VEX_CONTEXT_CHARS, MAX_VEX_CONTEXT_MESSAGES, trimVexContext } from "./context";
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

import { describe, expect, it } from "vitest";
import { validateToolArguments } from "./runVexTurn";
import type { ToolDefinition } from "../types";

const tool: ToolDefinition = {
  name: "create_event",
  description: "Cria um evento",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      time: { type: "string", enum: ["09:00", "18:00"] },
    },
    required: ["title", "time"],
    additionalProperties: false,
  },
  requiresConfirmation: true,
  async execute() {
    return { summary: "ok" };
  },
};

describe("validateToolArguments", () => {
  it("aceita argumentos que seguem o contrato da ferramenta", () => {
    expect(validateToolArguments(tool, { title: "Estudar", time: "09:00" })).toBeNull();
  });

  it("recusa parâmetro obrigatório ausente, tipo incorreto e enum inválido", () => {
    expect(validateToolArguments(tool, { title: "Estudar" })).toContain("time");
    expect(validateToolArguments(tool, { title: 42, time: "09:00" })).toContain("title");
    expect(validateToolArguments(tool, { title: "Estudar", time: "12:00" })).toContain("não é aceito");
  });

  it("recusa chaves que não fazem parte do schema fechado", () => {
    expect(validateToolArguments(tool, { title: "Estudar", time: "09:00", prompt: "ignore" })).toContain("prompt");
  });

  it("recusa payloads grandes antes de executar a ferramenta", () => {
    expect(validateToolArguments(tool, { title: "x".repeat(17_000), time: "09:00" })).toContain("limite");
  });
});

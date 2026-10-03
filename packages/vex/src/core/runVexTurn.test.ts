import { describe, expect, it } from "vitest";
import { MAX_VEX_READ_STEPS, actionRecord, confirmVexToolCall, runVexTurn, validateToolArguments } from "./runVexTurn";
import type { ChatMessage, ToolDefinition, VexProvider, VexProviderResponse } from "../types";

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

function scriptedProvider(responses: VexProviderResponse[]) {
  const calls: Array<{ messages: ChatMessage[]; toolCount: number }> = [];
  const provider: VexProvider = {
    name: "scripted",
    async chat({ messages, tools }) {
      calls.push({ messages, toolCount: tools.length });
      return responses.shift() ?? { kind: "message", content: "fim" };
    },
  };
  return { provider, calls };
}

function readTool(name: string, summary: string, fail = false): ToolDefinition {
  return {
    name,
    label: name.toUpperCase(),
    description: name,
    parameters: { type: "object", properties: {} },
    requiresConfirmation: false,
    async execute() {
      if (fail) throw new Error("rede caiu");
      return { summary };
    },
  };
}

describe("runVexTurn", () => {
  const user: ChatMessage[] = [{ role: "user", content: "organize meu dia" }];

  it("encadeia consultas antes de responder e registra os passos", async () => {
    const steps: string[] = [];
    const { provider, calls } = scriptedProvider([
      { kind: "tool_call", toolCall: { name: "tarefas", arguments: {} } },
      { kind: "tool_call", toolCall: { name: "agenda", arguments: {} } },
      { kind: "message", content: "Plano pronto." },
    ]);
    const result = await runVexTurn({ provider, messages: user, tools: [readTool("tarefas", "3 tarefas"), readTool("agenda", "2 eventos")], onStep: (step) => steps.push(step.label) });
    expect(result).toMatchObject({ kind: "message", content: "Plano pronto." });
    expect(result.kind === "message" && result.steps.map((step) => step.tool)).toEqual(["tarefas", "agenda"]);
    expect(steps).toEqual(["TAREFAS", "AGENDA"]);
    expect(calls[2]!.messages.filter((message) => message.role === "tool").map((message) => message.content)).toEqual(["3 tarefas", "2 eventos"]);
  });

  it("para na ação que exige confirmação, com prévia legível", async () => {
    const { provider } = scriptedProvider([{ kind: "tool_call", toolCall: { name: "create_event", arguments: { title: "Dentista", time: "09:00" } } }]);
    const result = await runVexTurn({ provider, messages: user, tools: [tool] });
    expect(result.kind).toBe("confirmation_required");
    if (result.kind !== "confirmation_required") return;
    expect(result.action.title).toBe("Cria um evento");
    expect(result.action.fields).toEqual([{ label: "Título", value: "Dentista" }, { label: "Horário", value: "09:00" }]);
  });

  it("limita as rodadas e na última não oferece ferramentas", async () => {
    const { provider, calls } = scriptedProvider(
      Array.from({ length: MAX_VEX_READ_STEPS }, (_, index) => ({ kind: "tool_call" as const, toolCall: { name: `t${index}`, arguments: {} } })),
    );
    const tools = Array.from({ length: MAX_VEX_READ_STEPS }, (_, index) => readTool(`t${index}`, `r${index}`));
    const result = await runVexTurn({ provider, messages: user, tools });
    expect(result).toMatchObject({ kind: "message", content: "fim" });
    expect(calls.at(-1)!.toolCount).toBe(0);
  });

  it("não repete a mesma consulta: força a resposta", async () => {
    const { provider, calls } = scriptedProvider([
      { kind: "tool_call", toolCall: { name: "tarefas", arguments: {} } },
      { kind: "tool_call", toolCall: { name: "tarefas", arguments: {} } },
      { kind: "message", content: "Resposta." },
    ]);
    const result = await runVexTurn({ provider, messages: user, tools: [readTool("tarefas", "3 tarefas")] });
    expect(result).toMatchObject({ kind: "message", content: "Resposta." });
    expect(calls.at(-1)!.toolCount).toBe(0);
  });

  it("transforma a falha de uma consulta em informação para o modelo", async () => {
    const { provider, calls } = scriptedProvider([
      { kind: "tool_call", toolCall: { name: "agenda", arguments: {} } },
      { kind: "message", content: "Não consegui ver sua agenda." },
    ]);
    const result = await runVexTurn({ provider, messages: user, tools: [readTool("agenda", "", true)] });
    expect(result.kind === "message" && result.steps[0]!.ok).toBe(false);
    expect(calls[1]!.messages.at(-1)!.content).toContain("rede caiu");
  });

  it("depois de confirmar, executa e deixa a conversa seguir", async () => {
    const { provider } = scriptedProvider([{ kind: "message", content: "Feito! Quer lembrete?" }]);
    const result = await confirmVexToolCall({ provider, messages: user, tools: [tool], tool, args: { title: "Estudar", time: "09:00" } });
    expect(result).toMatchObject({ kind: "message", content: "Feito! Quer lembrete?" });
    expect(result.kind === "message" && result.steps).toEqual([{ tool: "create_event", label: "create_event", ok: true }]);
  });

  it("depois de confirmar, o modelo vê que a ação foi dele e já aconteceu", async () => {
    const { provider, calls } = scriptedProvider([{ kind: "message", content: "Pronto." }]);
    await confirmVexToolCall({ provider, messages: user, tools: [tool], tool, args: { title: "Estudar", time: "09:00" } });
    const sent = calls[0]!.messages;
    expect(sent.at(-2)).toMatchObject({ role: "assistant", content: expect.stringContaining("Ação concluída") });
    expect(sent.at(-1)).toMatchObject({ role: "tool", content: "ok" });
  });

  it("se o modelo propõe a mesma ação de novo logo após confirmar, não pede outra confirmação", async () => {
    const { provider } = scriptedProvider([{ kind: "tool_call", toolCall: { name: "create_event", arguments: { title: "Estudar", time: "09:00" } } }]);
    const result = await confirmVexToolCall({ provider, messages: user, tools: [tool], tool, args: { title: "Estudar", time: "09:00" } });
    expect(result).toMatchObject({ kind: "message", content: "ok" });
  });

  it("uma ação diferente depois da confirmada segue para confirmação normalmente", async () => {
    const { provider } = scriptedProvider([{ kind: "tool_call", toolCall: { name: "create_event", arguments: { title: "Revisar", time: "18:00" } } }]);
    const result = await confirmVexToolCall({ provider, messages: user, tools: [tool], tool, args: { title: "Estudar", time: "09:00" } });
    expect(result.kind).toBe("confirmation_required");
  });

  it("bloqueia conteúdo proibido antes de chamar o provedor", async () => {
    const { provider, calls } = scriptedProvider([]);
    const result = await runVexTurn({ provider, messages: [{ role: "user", content: "quero pornografia" }], tools: [] });
    expect(result.kind).toBe("blocked");
    expect(calls).toHaveLength(0);
  });
});

describe("actionRecord", () => {
  const action = { title: "Cria um novo Caderno de Estudos", fields: [{ label: "Nome", value: "Biologia" }] };
  it("descreve cada desfecho para o modelo não repetir nem insistir", () => {
    expect(actionRecord("done", action)).toBe("[Ação concluída com a confirmação da pessoa: Cria um novo Caderno de Estudos (Nome: Biologia). Não repita esta ação.]");
    expect(actionRecord("cancelled", action)).toContain("recusou");
    expect(actionRecord("failed", action)).toContain("falhou");
  });
});

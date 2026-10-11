import { describe, expect, it, vi } from "vitest";
import type { ToolDefinition } from "../types";
import { confirmVexToolCall, runVexTurn } from "../core/runVexTurn";
import { checkPlan, createPlanTool, keepPlanSteps, previewPlanSteps, readPlanSteps } from "./planTools";

function writeTool(name: string, execute: ToolDefinition["execute"] = async (args) => ({ summary: `ok ${String(args.title)}` })): ToolDefinition {
  return {
    name,
    description: `Cria ${name}`,
    parameters: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
    requiresConfirmation: true,
    preview: (args) => ({ title: `Criar ${name}`, fields: [{ label: "Título", value: String(args.title) }] }),
    execute,
  };
}

const readTool: ToolDefinition = { name: "list_tasks", description: "Lista", parameters: { type: "object", properties: {} }, requiresConfirmation: false, execute: async () => ({ summary: "" }) };

function setup(extra: ToolDefinition[] = []) {
  const tools: ToolDefinition[] = [writeTool("create_task"), writeTool("create_event"), readTool, ...extra];
  const plan = createPlanTool(() => tools);
  tools.push(plan);
  return { tools, plan };
}

const step = (tool: string, args: Record<string, unknown>) => ({ tool, arguments_json: JSON.stringify(args) });

describe("plano com várias ações", () => {
  it("lê os argumentos em texto JSON e mostra cada passo com o cartão da ferramenta", () => {
    const { tools } = setup();
    const steps = readPlanSteps({ steps: [step("create_task", { title: "Passagem" }), step("create_event", { title: "Voo" })] });
    expect(steps).toEqual([{ tool: "create_task", arguments: { title: "Passagem" } }, { tool: "create_event", arguments: { title: "Voo" } }]);
    expect(previewPlanSteps(steps, tools).map((preview) => preview.title)).toEqual(["Criar create_task", "Criar create_event"]);
  });

  it("recusa passo inválido, consulta, ferramenta desconhecida e plano dentro de plano", () => {
    const { tools } = setup();
    expect(checkPlan(readPlanSteps({ steps: [{ tool: "create_task", arguments_json: "não é json" }] }), tools)).toMatch(/passo 1/);
    expect(checkPlan(readPlanSteps({ steps: [step("list_tasks", {})] }), tools)).toMatch(/consulta/);
    expect(checkPlan(readPlanSteps({ steps: [step("apagar_tudo", {})] }), tools)).toMatch(/desconhecida/);
    expect(checkPlan(readPlanSteps({ steps: [step("propose_plan", { title: "x", steps: [] })] }), tools)).toMatch(/outro plano/);
    expect(checkPlan(readPlanSteps({ steps: [step("create_task", {})] }), tools)).toMatch(/title/);
    expect(checkPlan([], tools)).toMatch(/não tem passos/);
  });

  it("mantém só os passos escolhidos", () => {
    const args = { title: "Viagem", steps: [step("create_task", { title: "a" }), step("create_task", { title: "b" }), step("create_task", { title: "c" })] };
    expect(readPlanSteps(keepPlanSteps(args, [0, 2])).map((item) => item?.arguments.title)).toEqual(["a", "c"]);
  });

  it("executa em ordem, continua depois de uma falha e informa o que falhou", async () => {
    const failing = writeTool("create_note", async () => {
      throw new Error("rede");
    });
    const { plan } = setup([failing]);
    const result = await plan.execute({ title: "Viagem", steps: [step("create_task", { title: "a" }), step("create_note", { title: "b" }), step("create_event", { title: "c" })] });
    expect(result.ok).toBe(true);
    const results = (result.data as { results: Array<{ ok: boolean; tool: string }> }).results;
    expect(results.map((item) => item.ok)).toEqual([true, false, true]);
    expect(result.summary).toMatch(/2 feitas, 1 com falha/);
    expect(result.summary).toMatch(/não devem ser repetidas/);
  });

  it("no turno, o plano pede uma confirmação só e devolve o resultado de cada passo", async () => {
    const { tools } = setup();
    const args = { title: "Viagem", steps: [step("create_task", { title: "a" }), step("create_event", { title: "b" })] };
    const provider = { name: "fake", chat: vi.fn().mockResolvedValueOnce({ kind: "tool_call", toolCall: { name: "propose_plan", arguments: args } }).mockResolvedValue({ kind: "message", content: "Feito." }) };
    const turn = await runVexTurn({ provider, messages: [{ role: "user", content: "organiza a viagem" }], tools });
    expect(turn.kind).toBe("confirmation_required");
    const confirmed = await confirmVexToolCall({ provider, messages: [], tools, tool: tools.find((tool) => tool.name === "propose_plan")!, args });
    expect(confirmed.kind).toBe("message");
    if (confirmed.kind === "message") expect((confirmed.executed?.data as { results: unknown[] }).results).toHaveLength(2);
  });
});

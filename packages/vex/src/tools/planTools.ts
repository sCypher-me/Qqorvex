import { previewToolCall, validateToolArguments } from "../core/runVexTurn";
import type { ToolDefinition, VexActionPreview } from "../types";

export const PLAN_TOOL_NAME = "propose_plan";
const MAX_PLAN_STEPS = 12;

export interface PlanStepInput {
  tool: string;
  arguments: Record<string, unknown>;
}

export interface PlanStepResult {
  index: number;
  tool: string;
  title: string;
  ok: boolean;
  summary: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseArguments(step: Record<string, unknown>): Record<string, unknown> | null {
  if (isRecord(step.arguments)) return step.arguments;
  if (typeof step.arguments_json !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(step.arguments_json);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Lê os passos do plano como vieram do modelo. Os argumentos chegam como texto JSON
 * (`arguments_json`: o Gemini não aceita objeto aninhado sem propriedades declaradas) ou, já
 * lidos, como `arguments`. Passo sem forma válida vira `null` para o plano ser recusado inteiro.
 */
export function readPlanSteps(args: Record<string, unknown>): Array<PlanStepInput | null> {
  const raw = Array.isArray(args.steps) ? args.steps : [];
  return raw.map((step) => {
    if (!isRecord(step) || typeof step.tool !== "string") return null;
    const parsed = parseArguments(step);
    return parsed ? { tool: step.tool, arguments: parsed } : null;
  });
}

/** Mesmo plano só com os passos mantidos pela pessoa (índices originais). */
export function keepPlanSteps(args: Record<string, unknown>, keep: number[]): Record<string, unknown> {
  const raw = Array.isArray(args.steps) ? args.steps : [];
  return { ...args, steps: raw.filter((_, index) => keep.includes(index)) };
}

function stepPreview(tool: ToolDefinition, args: Record<string, unknown>): VexActionPreview {
  return previewToolCall(tool, args);
}

/** Confere o plano inteiro antes de mostrar: cada passo precisa ser uma ação conhecida e válida. */
export function checkPlan(steps: Array<PlanStepInput | null>, tools: ToolDefinition[]): string | null {
  if (steps.length === 0) return "o plano não tem passos";
  if (steps.length > MAX_PLAN_STEPS) return `o plano tem mais de ${MAX_PLAN_STEPS} passos`;
  for (const [index, step] of steps.entries()) {
    if (!step) return `o passo ${index + 1} não tem ferramenta e argumentos válidos (arguments_json precisa ser um objeto JSON)`;
    const tool = tools.find((candidate) => candidate.name === step.tool);
    if (!tool) return `o passo ${index + 1} usa uma ação desconhecida (${step.tool})`;
    if (tool.name === PLAN_TOOL_NAME) return "um plano não pode conter outro plano";
    if (!tool.requiresConfirmation) return `o passo ${index + 1} é uma consulta; consultas não entram no plano`;
    const error = validateToolArguments(tool, step.arguments);
    if (error) return `no passo ${index + 1}, ${error}`;
  }
  return null;
}

/** Como cada passo aparece na lista do plano (o mesmo cartão das ações avulsas). */
export function previewPlanSteps(steps: Array<PlanStepInput | null>, tools: ToolDefinition[]): VexActionPreview[] {
  return steps.map((step) => {
    if (!step) return { title: "Passo inválido", fields: [] };
    const tool = tools.find((candidate) => candidate.name === step.tool);
    return tool ? stepPreview(tool, step.arguments) : { title: step.tool, fields: [] };
  });
}

/**
 * Plano único para pedidos com várias ações que gravam dados, em uma ou várias áreas ("organize
 * minha semana": criar tarefas, marcar um bloco na agenda, registrar um gasto). A pessoa vê todas
 * as ações juntas, retira as que não quer e confirma o resto com um botão. Cada passo roda em
 * ordem; uma falha não desfaz nem interrompe os outros, e o resultado diz exatamente o que foi
 * feito e o que falhou — para tentar de novo só o que falhou.
 */
export function createPlanTool(getTools: () => ToolDefinition[]): ToolDefinition {
  return {
    name: "propose_plan",
    label: "Plano",
    description:
      "Propõe de uma vez um plano com DUAS OU MAIS ações que gravam dados (em uma ou várias áreas do app), para a pessoa revisar, retirar o que não quiser e confirmar tudo com um botão. Use sempre que o pedido exigir mais de uma ação que cria, altera ou apaga algo — em vez de pedir confirmação de uma por uma. Cada passo indica a ferramenta (nome exato de uma ação que grava) e os argumentos completos dela. Consultas não entram no plano: faça-as antes.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Resumo curto do objetivo (ex.: 'Preparar a viagem de sexta')" },
        steps: {
          type: "array",
          description: "Ações na ordem em que devem acontecer",
          items: {
            type: "object",
            properties: {
              tool: { type: "string", description: "Nome exato da ferramenta que grava" },
              arguments_json: { type: "string", description: 'Argumentos completos dessa ferramenta, como objeto JSON em texto (ex.: {"title":"Comprar passagem","dueDate":"2026-10-15"})' },
            },
            required: ["tool", "arguments_json"],
          },
        },
      },
      required: ["title", "steps"],
    },
    requiresConfirmation: true,
    validate: (args) => checkPlan(readPlanSteps(args), getTools()),
    preview(args) {
      const steps = readPlanSteps(args);
      const previews = previewPlanSteps(steps, getTools());
      return {
        title: String(args.title ?? "Plano"),
        fields: previews.map((preview, index) => ({ label: `${index + 1}. ${preview.title}`, value: preview.fields.map((field) => `${field.label}: ${field.value}`).join(" · ") || "—" })),
      };
    },
    async execute(args) {
      const tools = getTools();
      const steps = readPlanSteps(args);
      const problem = checkPlan(steps, tools);
      if (problem) return { summary: `Não executei o plano: ${problem}. Nada foi alterado.`, ok: false };

      const results: PlanStepResult[] = [];
      for (const [index, maybeStep] of steps.entries()) {
        const step = maybeStep!;
        const tool = tools.find((candidate) => candidate.name === step.tool)!;
        const title = stepPreview(tool, step.arguments).title;
        try {
          const result = await tool.execute(step.arguments);
          results.push({ index, tool: tool.name, title, ok: result.ok !== false, summary: result.summary });
        } catch (error) {
          const detail = error instanceof Error && error.message ? ` (${error.message.slice(0, 120)})` : "";
          results.push({ index, tool: tool.name, title, ok: false, summary: `Não foi possível concluir${detail}.` });
        }
      }

      const done = results.filter((result) => result.ok);
      const failed = results.filter((result) => !result.ok);
      const lines = results.map((result) => `${result.ok ? "✓" : "✗"} ${result.title}: ${result.summary}`).join("\n");
      const head = failed.length === 0 ? `Plano concluído: ${done.length} ${done.length === 1 ? "ação" : "ações"}.` : `Plano concluído em parte: ${done.length} feitas, ${failed.length} com falha. As que deram certo não devem ser repetidas.`;
      return { summary: `${head}\n${lines}`, ok: done.length > 0, data: { results } };
    },
  };
}

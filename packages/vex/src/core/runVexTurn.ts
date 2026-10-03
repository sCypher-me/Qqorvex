import { checkQuerySafety } from "../safety";
import type { ChatMessage, ToolDefinition, VexActionPreview, VexProvider, VexStep, VexTurnResult } from "../types";

const MAX_TOOL_ARGUMENTS_CHARS = 16_000;

type JsonSchemaProperty = {
  type?: string;
  enum?: unknown[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Providers externos e modelos locais são fontes não confiáveis. O contrato de TypeScript não
 * existe em runtime, então os argumentos do tool-call precisam ser conferidos antes de chegar
 * aos repositories dos módulos. A validação é deliberadamente pequena: cobre o subset de JSON
 * Schema que as ferramentas do Qqorvex usam hoje, sem adicionar uma dependência ao bundle.
 */
export function validateToolArguments(tool: ToolDefinition, args: unknown): string | null {
  if (!isRecord(args)) return "os argumentos não são um objeto";

  const serialized = JSON.stringify(args);
  if (!serialized || serialized.length > MAX_TOOL_ARGUMENTS_CHARS) return "os argumentos excedem o limite permitido";

  const schema = isRecord(tool.parameters) ? tool.parameters : {};
  const properties = isRecord(schema.properties) ? (schema.properties as Record<string, JsonSchemaProperty>) : {};
  const required = Array.isArray(schema.required) ? schema.required.filter((key): key is string => typeof key === "string") : [];

  for (const key of required) {
    if (!(key in args) || args[key] === null || args[key] === undefined) {
      return `falta o parâmetro obrigatório "${key}"`;
    }
  }

  if (schema.additionalProperties === false) {
    const unknownKey = Object.keys(args).find((key) => !(key in properties));
    if (unknownKey) return `o parâmetro "${unknownKey}" não é aceito por esta ferramenta`;
  }

  for (const [key, value] of Object.entries(args)) {
    const property = properties[key];
    if (!property || value === null || value === undefined) continue;

    if (property.enum && !property.enum.some((allowed) => Object.is(allowed, value))) {
      return `o valor de "${key}" não é aceito`;
    }

    if (property.type === "string" && typeof value !== "string") return `"${key}" precisa ser texto`;
    if (property.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) {
      return `"${key}" precisa ser um número válido`;
    }
    if (property.type === "boolean" && typeof value !== "boolean") return `"${key}" precisa ser booleano`;
    if (property.type === "object" && !isRecord(value)) return `"${key}" precisa ser um objeto`;
    if (property.type === "array" && !Array.isArray(value)) return `"${key}" precisa ser uma lista`;
  }

  return null;
}

/** Quantas consultas (ferramentas sem confirmação) a Vex pode encadear antes de responder. */
export const MAX_VEX_READ_STEPS = 3;

type TurnParams = {
  provider: VexProvider;
  messages: ChatMessage[];
  tools: ToolDefinition[];
  /** Chamado a cada consulta concluída, para a interface mostrar o progresso ("Consultando Agenda…"). */
  onStep?: (step: VexStep) => void;
};

/**
 * Um "turno" da Vex: mensagem do usuário → (Safety) → provider → ferramentas → resposta final.
 * Consultas (somente leitura) executam direto e podem ser encadeadas — "planeje meu dia" pode
 * olhar tarefas e agenda antes de responder. Uma ferramenta que persiste dados interrompe o
 * turno e devolve `confirmation_required`; ela só roda depois de `confirmVexToolCall`.
 */
export async function runVexTurn(params: TurnParams): Promise<VexTurnResult> {
  const lastUserMessage = [...params.messages].reverse().find((m) => m.role === "user");
  if (lastUserMessage) {
    const safety = checkQuerySafety(lastUserMessage.content);
    if (safety.blocked) return { kind: "blocked", reason: safety.reason! };
  }
  return continueTurn(params, []);
}

/**
 * Chamado pela UI depois que o usuário confirma uma ação que exigia confirmação. Depois de
 * executar, a conversa segue: a Vex pode responder, consultar algo ou propor a próxima ação
 * (ex.: criar a segunda de três tarefas pedidas).
 */
export async function confirmVexToolCall(params: TurnParams & { tool: ToolDefinition; args: Record<string, unknown> }): Promise<VexTurnResult> {
  const validationError = validateToolArguments(params.tool, params.args);
  if (validationError) return { kind: "message", content: `Não consegui executar essa ação: ${validationError}.`, steps: [] };
  const { message, step } = await executeTool(params.tool, params.args);
  params.onStep?.(step);
  if (!step.ok) return { kind: "message", content: message.content, steps: [step] };
  const result = await continueTurn({ ...params, messages: [...params.messages, message] }, [step]);
  // Se o modelo não comentar o resultado, o resumo da ferramenta é a resposta.
  if (result.kind === "message" && !result.content.trim()) return { ...result, content: message.content };
  return result;
}

async function continueTurn(params: TurnParams, initialSteps: VexStep[]): Promise<VexTurnResult> {
  const { provider, tools, onStep } = params;
  let messages = params.messages;
  const steps = [...initialSteps];
  const seen = new Set<string>();
  let lastSummary: string | null = null;

  for (let round = 0; round <= MAX_VEX_READ_STEPS; round += 1) {
    // Na última rodada a Vex precisa responder com o que já tem: sem ferramentas disponíveis.
    const offerTools = round < MAX_VEX_READ_STEPS;
    const response = await provider.chat({ messages, tools: offerTools ? tools : [] });

    if (response.kind === "message") {
      const content = response.content.trim() || lastSummary || "";
      return { kind: "message", content, steps };
    }

    if (!response.toolCall || typeof response.toolCall.name !== "string" || !isRecord(response.toolCall.arguments)) {
      return { kind: "message", content: lastSummary ?? "Não consegui interpretar a ação sugerida pela Vex.", steps };
    }

    const tool = tools.find((t) => t.name === response.toolCall.name);
    if (!tool) {
      return { kind: "message", content: lastSummary ?? `A Vex tentou usar uma ferramenta desconhecida: ${response.toolCall.name}.`, steps };
    }

    const args = response.toolCall.arguments;
    const validationError = validateToolArguments(tool, args);
    if (validationError) {
      return { kind: "message", content: `Não consegui executar essa ação: ${validationError}.`, steps };
    }

    if (tool.requiresConfirmation) {
      return {
        kind: "confirmation_required",
        toolCall: response.toolCall,
        tool,
        preview: describeToolCall(tool, args),
        action: previewToolCall(tool, args),
        steps,
      };
    }

    const key = `${tool.name}:${JSON.stringify(args)}`;
    if (seen.has(key)) {
      // Pediu a mesma consulta de novo: força a resposta na próxima rodada.
      const final = await provider.chat({ messages, tools: [] });
      const content = final.kind === "message" && final.content.trim() ? final.content : lastSummary ?? "";
      return { kind: "message", content, steps };
    }
    seen.add(key);

    const { message, step } = await executeTool(tool, args);
    steps.push(step);
    onStep?.(step);
    lastSummary = message.content;
    messages = [...messages, message];
  }

  return { kind: "message", content: lastSummary ?? "", steps };
}

async function executeTool(tool: ToolDefinition, args: Record<string, unknown>): Promise<{ message: ChatMessage; step: VexStep }> {
  const label = tool.label ?? tool.name;
  try {
    const result = await tool.execute(args);
    return { message: { role: "tool", toolName: tool.name, content: result.summary }, step: { tool: tool.name, label, ok: true } };
  } catch (error) {
    const detail = error instanceof Error && error.message ? ` (${error.message.slice(0, 160)})` : "";
    return {
      message: { role: "tool", toolName: tool.name, content: `Não foi possível concluir "${label}" agora${detail}. Nada foi alterado além do que já estava salvo.` },
      step: { tool: tool.name, label, ok: false },
    };
  }
}

function humanizeKey(key: string): string {
  const spaced = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatArgValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function previewToolCall(tool: ToolDefinition, args: Record<string, unknown>): VexActionPreview {
  if (tool.preview) {
    try {
      return tool.preview(args);
    } catch {
      /* cai no genérico */
    }
  }
  return {
    title: tool.description.split(/[.(—]/)[0]!.trim() || tool.name,
    fields: Object.entries(args)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => ({ label: humanizeKey(key), value: formatArgValue(value) })),
  };
}

function describeToolCall(tool: ToolDefinition, args: Record<string, unknown>): string {
  const action = previewToolCall(tool, args);
  const fields = action.fields.map((field) => `${field.label}: ${field.value}`).join(", ");
  return fields ? `${action.title} (${fields})` : action.title;
}

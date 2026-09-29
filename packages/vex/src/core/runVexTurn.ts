import { checkQuerySafety } from "../safety";
import type { ChatMessage, ToolDefinition, VexProvider, VexTurnResult } from "../types";

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

/**
 * Um "turno" da Vex: mensagem do usuário → (Safety) → provider → se houver tool_call, decide
 * entre executar direto (ferramentas de consulta) ou pedir confirmação (ferramentas que
 * persistem dados) → resposta final. Nunca executa uma ferramenta que exige confirmação sem
 * uma chamada explícita a `confirmVexToolCall` depois.
 */
export async function runVexTurn(params: {
  provider: VexProvider;
  messages: ChatMessage[];
  tools: ToolDefinition[];
}): Promise<VexTurnResult> {
  const { provider, messages, tools } = params;

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (lastUserMessage) {
    const safety = checkQuerySafety(lastUserMessage.content);
    if (safety.blocked) return { kind: "blocked", reason: safety.reason! };
  }

  const response = await provider.chat({ messages, tools });

  if (response.kind === "message") {
    return { kind: "message", content: response.content };
  }

  if (!response.toolCall || typeof response.toolCall.name !== "string" || !isRecord(response.toolCall.arguments)) {
    return { kind: "message", content: "Não consegui interpretar a ação sugerida pela Vex." };
  }

  const tool = tools.find((t) => t.name === response.toolCall.name);
  if (!tool) {
    return { kind: "message", content: `A Vex tentou usar uma ferramenta desconhecida: ${response.toolCall.name}.` };
  }

  const validationError = validateToolArguments(tool, response.toolCall.arguments);
  if (validationError) {
    return { kind: "message", content: `Não consegui executar essa ação: ${validationError}.` };
  }

  if (tool.requiresConfirmation) {
    return {
      kind: "confirmation_required",
      toolCall: response.toolCall,
      tool,
      preview: describeToolCall(tool, response.toolCall.arguments),
    };
  }

  return executeAndSummarize({ provider, messages, tools, tool, args: response.toolCall.arguments });
}

/** Chamado pela UI depois que o usuário confirma uma ação que exigia confirmação. */
export async function confirmVexToolCall(params: {
  provider: VexProvider;
  messages: ChatMessage[];
  tools: ToolDefinition[];
  tool: ToolDefinition;
  args: Record<string, unknown>;
}): Promise<VexTurnResult> {
  const validationError = validateToolArguments(params.tool, params.args);
  if (validationError) return { kind: "message", content: `Não consegui executar essa ação: ${validationError}.` };
  return executeAndSummarize(params);
}

async function executeAndSummarize(params: {
  provider: VexProvider;
  messages: ChatMessage[];
  tools: ToolDefinition[];
  tool: ToolDefinition;
  args: Record<string, unknown>;
}): Promise<VexTurnResult> {
  const { provider, messages, tools, tool, args } = params;
  const validationError = validateToolArguments(tool, args);
  if (validationError) return { kind: "message", content: `Não consegui executar essa ação: ${validationError}.` };
  const result = await tool.execute(args);

  const toolMessage: ChatMessage = { role: "tool", toolName: tool.name, content: result.summary };
  const followUp = await provider.chat({ messages: [...messages, toolMessage], tools });

  if (followUp.kind === "message") return { kind: "message", content: followUp.content };
  return { kind: "message", content: result.summary };
}

function describeToolCall(tool: ToolDefinition, args: Record<string, unknown>): string {
  const argsText = Object.entries(args)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");
  return `${tool.description} (${argsText || "sem parâmetros"})`;
}

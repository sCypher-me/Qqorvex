import { checkQuerySafety } from "../safety";
import type { ChatMessage, ToolDefinition, VexProvider, VexTurnResult } from "../types";

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

  const tool = tools.find((t) => t.name === response.toolCall.name);
  if (!tool) {
    return { kind: "message", content: `A Vex tentou usar uma ferramenta desconhecida: ${response.toolCall.name}.` };
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

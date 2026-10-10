import type { ChatMessage, ToolDefinition, VexProvider, VexProviderResponse } from "../types";
import type { VexStyle } from "../vexStyle";
import { vexPersonalityInstruction } from "../../../../supabase/functions/_shared/vexPersonalities";

/**
 * "Priorizar Ollama... para a v1" no ambiente de desenvolvimento — mas "o aplicativo em produção
 * não pode pressupor que Ollama esteja rodando no computador do criador". Este provider fala com
 * uma instância Ollama local via HTTP; se o servidor não responder, o erro sobe para quem chamou
 * decidir o fallback (ex.: usar EchoProvider), sem travar o resto da Vex.
 */
export class OllamaProvider implements VexProvider {
  readonly name = "ollama";

  constructor(
    private readonly model: string,
    private readonly baseUrl: string = "http://localhost:11434",
  ) {}

  async chat({ messages, tools, vexStyle = "direct" }: { messages: ChatMessage[]; tools: ToolDefinition[]; vexStyle?: VexStyle }): Promise<VexProviderResponse> {
    const firstUserIndex = messages.findIndex((message) => message.role !== "system");
    const styledMessages = [...messages];
    styledMessages.splice(firstUserIndex < 0 ? styledMessages.length : firstUserIndex, 0, { role: "system", content: vexPersonalityInstruction(vexStyle) });
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        messages: styledMessages.map((m) => ({ role: m.role === "tool" ? "tool" : m.role, content: m.content })),
        tools: tools.map((tool) => ({
          type: "function",
          function: { name: tool.name, description: tool.description, parameters: tool.parameters },
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama respondeu ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as {
      message?: { content?: string; tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }> };
    };

    const toolCall = data.message?.tool_calls?.[0];
    if (toolCall) {
      return { kind: "tool_call", toolCall: { name: toolCall.function.name, arguments: toolCall.function.arguments } };
    }

    return { kind: "message", content: data.message?.content ?? "" };
  }
}

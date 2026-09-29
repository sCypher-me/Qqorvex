import type { SupabaseClient, Database } from "@qqorvex/database";
import type { ChatMessage, ToolDefinition, VexProvider, VexProviderResponse } from "../types";

/**
 * Cérebro hospedado de verdade da Vex — fala com a Edge Function `vex-chat`, nunca direto com a
 * API do Gemini (a chave fica em `app_secrets`, só o servidor a vê). Antes disso a Vex só
 * funcionava com Ollama local; este provider é o que permite ela responder de qualquer lugar,
 * não só no computador de quem está desenvolvendo.
 */
export class GeminiProvider implements VexProvider {
  readonly name = "gemini";
  private readonly inFlight = new Map<string, Promise<VexProviderResponse>>();

  constructor(private readonly client: SupabaseClient<Database>) {}

  async chat({ messages, tools }: { messages: ChatMessage[]; tools: ToolDefinition[] }): Promise<VexProviderResponse> {
    // Evita duas chamadas idênticas quando Enter, re-render ou reconexão disparam o mesmo turno.
    // Não há cache de resposta concluída: uma resposta antiga nunca deve repetir uma ação.
    const key = JSON.stringify({ messages, tools: tools.map(({ name, description, parameters }) => ({ name, description, parameters })) });
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const request = this.request(messages, tools);
    this.inFlight.set(key, request);
    try {
      return await request;
    } finally {
      this.inFlight.delete(key);
    }
  }

  private async request(messages: ChatMessage[], tools: ToolDefinition[]): Promise<VexProviderResponse> {
    const { data, error } = await this.client.functions.invoke("vex-chat", {
      body: {
        messages: messages.map((m) => ({ role: m.role, content: m.content, toolName: m.toolName })),
        tools: tools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })),
      },
    });

    if (error) {
      const context = (error as { context?: Response }).context;
      let detailedMessage: string | null = null;
      if (context) {
        try {
          const body = await context.json();
          detailedMessage = body.error ?? null;
        } catch {
          detailedMessage = null;
        }
      }
      throw new Error(detailedMessage ?? error.message);
    }

    if (!data || typeof data !== "object") throw new Error("Resposta inválida do serviço de IA.");
    const response = data as { kind?: unknown; content?: unknown; toolCall?: { name?: unknown; arguments?: unknown } };
    if (response.kind === "tool_call" && response.toolCall && typeof response.toolCall.name === "string" && response.toolCall.arguments && typeof response.toolCall.arguments === "object") {
      return { kind: "tool_call", toolCall: { name: response.toolCall.name, arguments: response.toolCall.arguments as Record<string, unknown> } };
    }
    return { kind: "message", content: typeof response.content === "string" ? response.content : "" };
  }
}

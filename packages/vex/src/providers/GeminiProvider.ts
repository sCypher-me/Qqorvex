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

  constructor(private readonly client: SupabaseClient<Database>) {}

  async chat({ messages, tools }: { messages: ChatMessage[]; tools: ToolDefinition[] }): Promise<VexProviderResponse> {
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

    if (data.kind === "tool_call") {
      return { kind: "tool_call", toolCall: data.toolCall };
    }
    return { kind: "message", content: data.content ?? "" };
  }
}

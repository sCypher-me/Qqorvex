import type { ChatMessage, ToolDefinition, VexProvider, VexProviderResponse } from "../types";

/**
 * "O aplicativo em produção não pode pressupor que Ollama esteja rodando no computador do
 * criador" — encapsula um provider primário com fallback automático: se o primário falhar
 * (Ollama fora do ar, erro de rede), a conversa continua com o fallback em vez de travar a Vex.
 * Cada chamada tenta o primário de novo, então a Vex volta a usar o modelo real assim que ele
 * estiver disponível de novo, sem precisar recarregar a página.
 */
export class ResilientProvider implements VexProvider {
  readonly name: string;

  constructor(
    private readonly primary: VexProvider,
    private readonly fallback: VexProvider,
  ) {
    this.name = primary.name;
  }

  async chat(input: { messages: ChatMessage[]; tools: ToolDefinition[] }): Promise<VexProviderResponse> {
    try {
      return await this.primary.chat(input);
    } catch {
      return this.fallback.chat(input);
    }
  }
}

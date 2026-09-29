import type { ChatMessage, ToolDefinition, VexProvider, VexProviderResponse } from "../types";

const PROVIDER_ERROR_EVENT = "qv:vex-provider-error";

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, 240) : "Falha sem detalhes disponíveis.";
}

function reportProviderFailure(provider: VexProvider, error: unknown): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(PROVIDER_ERROR_EVENT, {
      detail: {
        provider: provider.name,
        message: safeErrorMessage(error),
      },
    }),
  );
}

/**
 * "O aplicativo em produção não pode pressupor que Ollama esteja rodando no computador do
 * criador" — encapsula um provider primário com fallback automático: se o primário falhar
 * (Ollama fora do ar, erro de rede), a conversa continua com o fallback em vez de travar a Vex.
 * Cada chamada tenta o primário de novo, então a Vex volta a usar o modelo real assim que ele
 * estiver disponível de novo, sem precisar recarregar a página.
 */
export class ResilientProvider implements VexProvider {
  readonly name: string;
  private primaryFailures = 0;
  private primaryUnavailableUntil = 0;

  constructor(
    private readonly primary: VexProvider,
    private readonly fallback: VexProvider,
  ) {
    this.name = primary.name;
  }

  async chat(input: { messages: ChatMessage[]; tools: ToolDefinition[] }): Promise<VexProviderResponse> {
    if (Date.now() < this.primaryUnavailableUntil) return this.fallback.chat(input);

    try {
      const response = await this.primary.chat(input);
      this.primaryFailures = 0;
      this.primaryUnavailableUntil = 0;
      return response;
    } catch (error) {
      reportProviderFailure(this.primary, error);
      this.primaryFailures = Math.min(this.primaryFailures + 1, 4);
      const cooldownMs = Math.min(60_000, 2_000 * 2 ** (this.primaryFailures - 1));
      this.primaryUnavailableUntil = Date.now() + cooldownMs;
      return this.fallback.chat(input);
    }
  }
}

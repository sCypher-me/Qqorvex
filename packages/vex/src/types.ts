/**
 * Contratos centrais da Vex. "O modelo de IA é apenas uma camada; a Vex deve permanecer
 * integrada aos módulos do Qqorvex e independente de fornecedor" — por isso todo provider
 * (Ollama, futuro provedor comercial, ou o EchoProvider de fallback) implementa a mesma
 * interface `VexProvider`, e toda ferramenta (`ToolDefinition`) fala apenas com módulos e
 * repositories, nunca com o Supabase diretamente ("A Vex não acessa o Supabase diretamente").
 */

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** Presente quando role === "tool": nome da ferramenta cujo resultado este message carrega. */
  toolName?: string;
}

export interface ToolResult {
  summary: string;
  data?: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON-schema-like description dos argumentos, só para o provider decidir como chamar. */
  parameters: Record<string, unknown>;
  /**
   * "Mudanças persistentes originadas pela Vex exigem confirmação apropriada." Ferramentas de
   * consulta (somente leitura) executam direto; ferramentas que criam/alteram dados exigem
   * confirmação explícita do usuário antes de rodar.
   */
  requiresConfirmation: boolean;
  execute: (args: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export type VexProviderResponse =
  | { kind: "message"; content: string }
  | { kind: "tool_call"; toolCall: ToolCall };

export interface VexProvider {
  readonly name: string;
  chat(input: { messages: ChatMessage[]; tools: ToolDefinition[] }): Promise<VexProviderResponse>;
}

export type VexTurnResult =
  | { kind: "message"; content: string }
  | { kind: "confirmation_required"; toolCall: ToolCall; tool: ToolDefinition; preview: string }
  | { kind: "blocked"; reason: string };

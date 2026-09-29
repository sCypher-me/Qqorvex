import type { ChatMessage } from "../types";

/** Limites conservadores para não pagar/enviar contexto histórico desnecessário ao provedor. */
export const MAX_VEX_CONTEXT_MESSAGES = 32;
export const MAX_VEX_CONTEXT_CHARS = 72_000;

/**
 * Mantém as instruções/contexto do aplicativo e os turnos mais recentes da conversa.
 * O histórico completo continua persistido no Supabase; apenas o recorte enviado ao modelo é
 * limitado para reduzir custo, latência e risco de estourar o contexto do provider.
 */
export function trimVexContext(messages: ChatMessage[]): ChatMessage[] {
  const systemMessages = messages.filter((message) => message.role === "system");
  const conversationMessages = messages.filter((message) => message.role !== "system");
  const selected: ChatMessage[] = [];
  let chars = systemMessages.reduce((total, message) => total + message.content.length, 0);

  for (let index = conversationMessages.length - 1; index >= 0 && selected.length < MAX_VEX_CONTEXT_MESSAGES; index -= 1) {
    const message = conversationMessages[index]!;
    if (chars + message.content.length > MAX_VEX_CONTEXT_CHARS) continue;
    selected.push(message);
    chars += message.content.length;
  }

  selected.reverse();
  return [...systemMessages, ...selected];
}

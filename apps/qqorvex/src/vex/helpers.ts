import type { VexConversation } from "@qqorvex/vex";

/** Título automático a partir da primeira pergunta — a lista de conversas deixa de ser "Nova conversa" repetido. */
export function titleFromPrompt(text: string): string {
  const line = text.replace(/\s+/g, " ").trim();
  if (line.length <= 56) return line.charAt(0).toUpperCase() + line.slice(1);
  const cut = line.slice(0, 56);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = (lastSpace > 32 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:!?-]+$/, "");
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}…`;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

const GROUPS = ["Hoje", "Ontem", "Últimos 7 dias", "Últimos 30 dias", "Mais antigas"] as const;

export function groupConversations(conversations: VexConversation[], now = new Date()): Array<{ label: string; items: VexConversation[] }> {
  const today = startOfDay(now);
  const day = 86_400_000;
  const buckets = new Map<string, VexConversation[]>();
  for (const conversation of conversations) {
    const at = startOfDay(new Date(conversation.updated_at));
    const label = at >= today ? GROUPS[0] : at >= today - day ? GROUPS[1] : at >= today - 7 * day ? GROUPS[2] : at >= today - 30 * day ? GROUPS[3] : GROUPS[4];
    buckets.set(label, [...(buckets.get(label) ?? []), conversation]);
  }
  return GROUPS.filter((label) => buckets.has(label)).map((label) => ({ label, items: buckets.get(label)! }));
}

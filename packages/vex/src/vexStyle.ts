export type VexStyle = "direct" | "conversational";

export const VEX_STYLE_OPTIONS: Array<{ value: VexStyle; label: string; description: string }> = [
  { value: "direct", label: "Direta e acolhedora", description: "Respostas mais curtas, práticas e gentis." },
  { value: "conversational", label: "Calorosa e conversadora", description: "Mais contexto e uma conversa próxima, sem perder o foco." },
];

export function normalizeVexStyle(value: unknown): VexStyle {
  return value === "conversational" ? "conversational" : "direct";
}

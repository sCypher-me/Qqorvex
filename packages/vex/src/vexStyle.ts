export type VexStyle = "direct" | "conversational" | "encouraging";

export const VEX_STYLE_OPTIONS: Array<{ value: VexStyle; label: string; description: string }> = [
  { value: "direct", label: "Direta e acolhedora", description: "Vai ao ponto com gentileza, organiza o próximo passo e evita excesso de texto." },
  { value: "conversational", label: "Calorosa e conversadora", description: "Traz contexto útil e uma conversa próxima, sem perder o foco." },
  { value: "encouraging", label: "Mentora estratégica", description: "Ajuda a clarear prioridades, comparar caminhos e transformar objetivos em passos realistas — sem decidir por você ou cobrar." },
];

export function normalizeVexStyle(value: unknown): VexStyle {
  if (value === "conversational" || value === "encouraging") return value;
  return "direct";
}

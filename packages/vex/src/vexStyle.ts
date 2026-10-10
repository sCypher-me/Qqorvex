import {
  normalizeVexPersonality,
  VEX_PERSONALITY_LABELS,
  type VexPersonalityKey,
} from "../../../supabase/functions/_shared/vexPersonalities";

/**
 * Personalidade da Vex escolhida pela pessoa (`qqorvex_preferences.vex_style`). A instrução de
 * verdade mora no servidor (`supabase/functions/_shared/vexPersonalities.ts`); aqui ficam só os
 * textos de escolha do onboarding e de Configurações → Aparência, com o mesmo rótulo.
 */
export type VexStyle = VexPersonalityKey;

export interface VexStyleOption {
  value: VexStyle;
  label: string;
  description: string;
  /** Uma resposta de exemplo no tom da personalidade, para a pessoa sentir a diferença. */
  sample: string;
}

export const VEX_STYLE_OPTIONS: VexStyleOption[] = [
  {
    value: "direct",
    label: VEX_PERSONALITY_LABELS.direct,
    description: "Vai ao ponto com gentileza, organiza o próximo passo e evita excesso de texto.",
    sample: "Você tem 3 tarefas hoje; a mais urgente é o relatório, às 17:00. Reservo das 14:00 às 15:00 para ele?",
  },
  {
    value: "conversational",
    label: VEX_PERSONALITY_LABELS.conversational,
    description: "Conversa de perto, explica o porquê das sugestões e traz contexto útil, sem perder o foco.",
    sample: "Hoje está mais leve do que parece: só o relatório tem prazo, às 17:00. Que tal começar por ele depois do almoço, com a cabeça descansada?",
  },
  {
    value: "encouraging",
    label: VEX_PERSONALITY_LABELS.encouraging,
    description: "Ajuda a clarear prioridades, comparar caminhos e transformar objetivos em passos realistas — sem decidir por você ou cobrar.",
    sample: "Seu foco hoje é fechar o relatório (17:00). Com 2 reuniões, o risco é ele ficar para o fim da tarde. Eu sugiro bloquear 14:00–15:00. Faz sentido?",
  },
];

export function normalizeVexStyle(value: unknown): VexStyle {
  return normalizeVexPersonality(value);
}

export function vexStyleLabel(value: unknown): string {
  return VEX_PERSONALITY_LABELS[normalizeVexStyle(value)];
}

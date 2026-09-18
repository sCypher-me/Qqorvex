/**
 * Retorno tátil — Web Vibration API (funciona no WebView Android do app empacotado via Tauri,
 * sem precisar de plugin nativo/permissão extra). Progressive enhancement de propósito: desktop e
 * navegadores sem suporte simplesmente não vibram, a ação em si nunca depende disso pra funcionar.
 * `prefers-reduced-motion` também desliga o vibrar — é sinal de sensibilidade a estímulo, não só
 * de animação visual.
 */
export type HapticLevel = "light" | "medium" | "success" | "warning" | "error";

const PATTERN: Record<HapticLevel, number | number[]> = {
  light: 10,
  medium: 20,
  success: [10, 40, 10],
  warning: [20, 60, 20],
  error: [30, 50, 30, 50, 30],
};

let reducedMotion = false;
if (typeof window !== "undefined" && window.matchMedia) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion = query.matches;
  query.addEventListener("change", (e) => {
    reducedMotion = e.matches;
  });
}

export function triggerHaptic(level: HapticLevel = "light"): void {
  if (reducedMotion) return;
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(PATTERN[level]);
  } catch {
    // Alguns navegadores lançam se chamado fora de um gesto do usuário — nunca deixa quebrar a ação.
  }
}

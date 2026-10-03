/**
 * Easter egg do resgate de códigos: 7 toques seguidos na estrela do Qqorvex. Um intervalo maior
 * que `maxGapMs` entre dois toques recomeça a contagem, então ninguém chega lá navegando para o
 * Hoje de vez em quando.
 */
const SECRET_TAP_COUNT = 7;
const SECRET_TAP_MAX_GAP_MS = 700;

export interface SecretTapState {
  count: number;
  lastAt: number;
}

export const INITIAL_SECRET_TAPS: SecretTapState = { count: 0, lastAt: 0 };

export function registerSecretTap(
  state: SecretTapState,
  now: number,
  required = SECRET_TAP_COUNT,
  maxGapMs = SECRET_TAP_MAX_GAP_MS,
): { state: SecretTapState; unlocked: boolean } {
  const count = state.count > 0 && now - state.lastAt <= maxGapMs ? state.count + 1 : 1;
  if (count >= required) return { state: INITIAL_SECRET_TAPS, unlocked: true };
  return { state: { count, lastAt: now }, unlocked: false };
}

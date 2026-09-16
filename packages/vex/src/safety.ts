/**
 * Safety Engine — v1 lean: só o Query Guard sobre texto (bloqueio de conteúdo adulto/erótico
 * antes de a mensagem chegar ao provider). "A proteção deve funcionar em várias camadas e não
 * depender de um único filtro" — este é a primeira camada; Content/Media/Output Guard e a
 * pesquisa Web (SearXNG) ficam para quando essa infraestrutura existir (ver pendências).
 */
const BLOCKED_PATTERNS = [/\bporn/i, /\bpornograf/i, /\bconteúdo erótico/i, /\bsexo expl[ií]cito/i];

export function checkQuerySafety(text: string): { blocked: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { blocked: true, reason: "Conteúdo adulto/erótico não é permitido na Vex." };
    }
  }
  return { blocked: false };
}

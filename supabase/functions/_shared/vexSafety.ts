/**
 * Guardrail for explicit adult-media intent. Anatomical, reproductive-health and other
 * educational requests remain allowed; this is an intent keyword check, not a broad sex filter.
 * Keep this dependency-free module shared by the client guard and both server entry points.
 */
const BLOCKED_PATTERNS = [
  /\bporn(?:o|ografia|ografic[oa]|ographic)?\b/i,
  /\bxxx\b/i,
  /\bhentai\b/i,
  /\bconte[uú]do\s+er[oó]tico\b/i,
  /\b(?:conto|hist[oó]ria)s?\s+er[oó]tic[oa]s?\b/i,
  /\bsexo\s+expl[ií]cito\b/i,
  /\b(?:vídeo|video)s?\s+(?:adultos?|pornogr[aá]ficos?)\b/i,
  /\b(?:nudes?|imagens?\s+[ií]ntimas)\b/i,
];

export function checkQuerySafety(text: string): { blocked: boolean; reason?: string } {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const compact = normalized.replace(/[^a-z0-9]/g, "");
  if (BLOCKED_PATTERNS.some((pattern) => pattern.test(text)) || /porn(?:o|ografia|ografico|ographic)?|xxx|hentai/.test(compact)) {
    return {
      blocked: true,
      reason: "Não posso pesquisar pornografia. Posso ajudar com anatomia, saúde ou educação sexual de forma informativa.",
    };
  }
  return { blocked: false };
}

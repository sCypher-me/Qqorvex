/** Convert the stable SQL quota marker into copy that can be shown in any module form. */
export function billingLimitMessage(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("message" in error) || typeof error.message !== "string") return null;
  const match = /^QQORVEX_LIMIT:(goals|habits|notebooks|mind_maps):(\d+)$/.exec(error.message);
  if (!match) return null;
  const labels: Record<string, string> = {
    goals: "metas ativas",
    habits: "hábitos ativos",
    notebooks: "cadernos não arquivados",
    mind_maps: "mapas mentais ativos",
  };
  return `O plano Free permite até ${match[2]} ${labels[match[1]!]}. Seu conteúdo existente continua acessível. Arquive um item ou veja o Qqorvex Plus para ampliar esse limite.`;
}

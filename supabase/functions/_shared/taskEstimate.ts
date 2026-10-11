/**
 * Estimativa de duração de tarefa sem duração salva (backlog do Hoje): pelo texto e pelas correções
 * anteriores da própria pessoa, sem IA nem custo. Usada pelo plano do dia na tela, pela Vex e pelos
 * avisos do servidor — por isso fica aqui, sem imports. Quando a confiança é baixa, a interface
 * pergunta "Quanto tempo leva?" em vez de assumir um número em silêncio.
 *
 * Ordem: 1) duração escrita no título/descrição ("30min", "1h30", "meia hora");
 *        2) tarefas parecidas que a pessoa já estimou (as correções dela);
 *        3) tipo da tarefa pelo verbo/assunto (pagar, ligar… curtas; estudar, relatório… longas);
 *        4) mediana das estimativas da pessoa (ou 30 min).
 */

export type EstimateConfidence = "alta" | "media" | "baixa";
export type EstimateSource = "texto" | "parecida" | "tipo" | "padrao";

export interface TaskEstimate {
  minutes: number;
  confidence: EstimateConfidence;
  source: EstimateSource;
  /** Para explicar a estimativa: a tarefa parecida usada, ou null. */
  basis: string | null;
}

export interface EstimableTask {
  id: string;
  title: string;
  description?: string | null;
}

export interface EstimatedHistoryTask extends EstimableTask {
  estimated_minutes: number | null;
}

const MIN_MINUTES = 5;
const MAX_MINUTES = 600;

function clampMinutes(value: number): number {
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(value / 5) * 5));
}

// "às 14h", "das 9h", "até as 18h" são horários, não durações.
const TIME_OF_DAY_BEFORE = /(?:^|\s)(?:às|as|das|ate|até|até as|ate as|a partir das)\s*$/i;

const DURATION_PATTERNS: Array<{ regex: RegExp; minutes: (match: RegExpExecArray) => number; isClock: boolean }> = [
  { regex: /(\d{1,2})\s?h\s?(\d{1,2})(?:\s?min)?(?=[\s.,;)!?]|$)/gi, minutes: (m) => Number(m[1]) * 60 + Number(m[2]), isClock: true },
  { regex: /(\d{1,2}(?:[.,]\d)?)\s?(?:h|hr|hrs|hora|horas)(?=[\s.,;)!?]|$)/gi, minutes: (m) => Number(m[1]!.replace(",", ".")) * 60, isClock: true },
  { regex: /(\d{1,3})\s?(?:min|mins|minuto|minutos)(?=[\s.,;)!?]|$)/gi, minutes: (m) => Number(m[1]), isClock: false },
  { regex: /meia hora(?=[\s.,;)!?]|$)/gi, minutes: () => 30, isClock: false },
  { regex: /uma hora(?=[\s.,;)!?]|$)/gi, minutes: () => 60, isClock: false },
];

/** Primeira duração escrita no texto e o trecho exato, ignorando horários ("às 14h"). */
export function extractDuration(text: string | null | undefined): { minutes: number; match: string } | null {
  if (!text) return null;
  for (const pattern of DURATION_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(text))) {
      const before = text.slice(0, match.index);
      const startsWord = match.index === 0 || /[\s(]/.test(text[match.index - 1]!);
      if (!startsWord || (pattern.isClock && TIME_OF_DAY_BEFORE.test(before))) continue;
      const minutes = pattern.minutes(match);
      // "reunião 14h": acima de 8 horas é quase sempre um horário do dia, não a duração da tarefa.
      if (pattern.isClock && minutes > 8 * 60) continue;
      return { minutes: clampMinutes(minutes), match: match[0] };
    }
  }
  return null;
}

/** Duração escrita no texto: "30min", "45 minutos", "1h", "1h30", "1,5 hora", "2 horas", "meia hora". */
export function parseDurationText(text: string | null | undefined): number | null {
  return extractDuration(text)?.minutes ?? null;
}

const STOPWORDS = new Set([
  "para", "com", "sem", "dos", "das", "nos", "nas", "uma", "umas", "uns", "por", "pelo", "pela", "que", "como", "mais", "meu", "minha", "seu", "sua", "este", "esta", "esse", "essa", "isso", "todo", "toda",
]);

function normalizeWords(text: string): Set<string> {
  return new Set(
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 3 && !STOPWORDS.has(word) && !/^\d+$/.test(word)),
  );
}

function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / (a.size + b.size - shared);
}

function median(values: number[]): number {
  const sorted = [...values].sort((x, y) => x - y);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

// Palavras sem acento (comparadas depois de normalizar). Prefixos pegam conjugações ("pagar", "paguei").
const QUICK = ["pagar", "pague", "pagament", "ligar", "ligac", "envi", "mand", "respond", "confirm", "agend", "marcar", "compr", "renov", "transfer", "imprim", "assin", "lembr", "avisar", "cancel", "reserv"];
const MEDIUM = ["revis", "organiz", "prepar", "limp", "arrum", "conferir", "atualiz", "corrig", "ajust", "configur", "separar", "ler "];
const LONG = ["estud", "escrev", "relatorio", "apresentac", "projeto", "desenvolv", "montar", "planej", "pesquis", "prova", "trabalho", "artigo", "monografia", "tcc", "aula", "curso", "implement", "redig"];

function typeEstimate(text: string): number | null {
  const normalized = ` ${text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()} `;
  const has = (prefixes: string[]) => prefixes.some((prefix) => normalized.includes(` ${prefix}`));
  const quick = has(QUICK);
  const medium = has(MEDIUM);
  const long = has(LONG);
  // Sinais conflitantes (ex.: "pagar e revisar"): não arrisca pelo tipo.
  if (Number(quick) + Number(medium) + Number(long) !== 1) return null;
  return quick ? 15 : medium ? 45 : 90;
}

/** Mediana das estimativas da pessoa, entre 15 min e 2 h; 30 min sem histórico. */
export function personalDefaultMinutes(history: Array<{ estimated_minutes: number | null }>): number {
  const values = history.map((task) => task.estimated_minutes ?? 0).filter((value) => value > 0);
  if (values.length === 0) return 30;
  return Math.min(120, Math.max(15, Math.round(median(values) / 5) * 5));
}

export function estimateTaskMinutes(task: EstimableTask, history: EstimatedHistoryTask[]): TaskEstimate {
  const written = parseDurationText(task.title) ?? parseDurationText(task.description);
  if (written) return { minutes: written, confidence: "alta", source: "texto", basis: null };

  const words = normalizeWords(task.title);
  const scored = history
    .filter((other) => other.id !== task.id && (other.estimated_minutes ?? 0) > 0)
    .map((other) => ({ other, score: similarity(words, normalizeWords(other.title)) }))
    .filter((item) => item.score >= 0.5)
    .sort((a, b) => b.score - a.score);
  if (scored.length > 0) {
    const best = scored[0]!;
    const close = scored.filter((item) => item.score >= best.score - 0.15).map((item) => item.other.estimated_minutes!);
    return {
      minutes: clampMinutes(median(close)),
      confidence: best.score >= 0.75 ? "alta" : "media",
      source: "parecida",
      basis: best.other.title,
    };
  }

  const byType = typeEstimate(`${task.title} ${task.description ?? ""}`);
  if (byType) return { minutes: byType, confidence: "media", source: "tipo", basis: null };

  return { minutes: personalDefaultMinutes(history), confidence: "baixa", source: "padrao", basis: null };
}

/** Explicação curta para a interface e para a Vex. */
export function describeEstimate(estimate: TaskEstimate): string {
  switch (estimate.source) {
    case "texto":
      return "duração escrita na tarefa";
    case "parecida":
      return `parecida com “${estimate.basis}”`;
    case "tipo":
      return "pelo tipo de tarefa";
    default:
      return "estimativa incerta";
  }
}

/** Estimativa no formato do plano do dia; `null` quando a tarefa já tem duração salva. */
export function planEstimateFor(
  task: EstimatedHistoryTask,
  history: EstimatedHistoryTask[],
): { minutes: number; confidence: EstimateConfidence; note: string } | null {
  if ((task.estimated_minutes ?? 0) > 0) return null;
  const estimate = estimateTaskMinutes(task, history);
  return { minutes: estimate.minutes, confidence: estimate.confidence, note: describeEstimate(estimate) };
}

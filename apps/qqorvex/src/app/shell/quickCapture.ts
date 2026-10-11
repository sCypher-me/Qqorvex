import { addDaysToKey, localDateKey, parseQuickTask, type TaskPriority } from "@qqorvex/module-tarefas";

/**
 * Captura rápida em linguagem natural: uma frase vira tarefa, compromisso, despesa, receita, nota,
 * ideia ou item da lista de compras. Nada é salvo aqui — a interface mostra o tipo, o destino e o
 * que foi entendido, e a pessoa confirma (ou troca o tipo) antes de criar.
 *
 *   "Dentista sexta às 15h"            → compromisso na Agenda, sexta 15:00–16:00
 *   "Gastei 40 no mercado"             → despesa de R$ 40,00 hoje em Finanças
 *   "Recebi R$ 8.500 de salário"       → receita
 *   "Ideia: app de receitas"           → ideia em Pessoal
 *   "Leite na lista"                   → item da lista de compras
 *   "Nota: pauta da reunião"           → nota
 *   "Pagar luz amanhã !alta"           → tarefa (padrão)
 */
export type CaptureKind = "task" | "event" | "expense" | "income" | "note" | "idea" | "shopping";

export const CAPTURE_KINDS: Array<{ kind: CaptureKind; label: string; destination: string; action: string; done: string }> = [
  { kind: "task", label: "Tarefa", destination: "Tarefas", action: "Criar tarefa", done: "Tarefa criada" },
  { kind: "event", label: "Compromisso", destination: "Agenda", action: "Criar compromisso", done: "Compromisso criado" },
  { kind: "expense", label: "Despesa", destination: "Finanças", action: "Registrar despesa", done: "Despesa registrada" },
  { kind: "income", label: "Receita", destination: "Finanças", action: "Registrar receita", done: "Receita registrada" },
  { kind: "note", label: "Nota", destination: "Notas", action: "Criar nota", done: "Nota criada" },
  { kind: "idea", label: "Ideia", destination: "Pessoal · Ideias", action: "Guardar ideia", done: "Ideia guardada" },
  { kind: "shopping", label: "Lista de compras", destination: "Pessoal · Lista de compras", action: "Pôr na lista", done: "Item adicionado" },
];

export interface QuickCapture {
  kind: CaptureKind;
  /** Título já limpo (sem data, hora, valor, prefixo). */
  title: string;
  /** Data (AAAA-MM-DD): prazo da tarefa, dia do compromisso ou da transação. */
  date?: string;
  /** Início e fim do compromisso ("HH:MM"). */
  start?: string;
  end?: string;
  amount?: number;
  priority?: TaskPriority;
  tags: string[];
  estimatedMinutes?: number;
  /** Como o tipo foi decidido: escrito pela pessoa (prefixo) ou deduzido. */
  explicit: boolean;
}

const PREFIXES: Array<[RegExp, CaptureKind]> = [
  [/^tarefa$/, "task"],
  [/^(evento|compromisso|agenda|agendar)$/, "event"],
  [/^(despesa|gasto|gastei|paguei)$/, "expense"],
  [/^(receita|entrada|recebi|ganhei)$/, "income"],
  [/^(nota|anotar|anotacao|anotação)$/, "note"],
  [/^ideia$/, "idea"],
  [/^(lista|lista de compras|compras|comprar)$/, "shopping"],
];

const EXPENSE_VERB = /(?:^|\s)(gastei|paguei|comprei|torrei)(?=\s|$)/i;
const INCOME_VERB = /(?:^|\s)(recebi|ganhei|entrou|caiu)(?=\s|$)/i;
const MONEY = /(?:R\$\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)|(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:reais|conto|contos|pila)\b)/i;
const BARE_NUMBER = /(?:^|\s)(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?=\s|$)/;
const SHOPPING_SUFFIX = /\s(?:na|à|a|pra|para a|para|pra a)\s+lista(?:\s+de\s+compras)?\s*$/i;
const RANGE = /(?:^|\s)(?:das|de)\s+(\d{1,2})(?:[h:](\d{2})?)\s*(?:às|as|até|ate|-|a)\s*(\d{1,2})(?:[h:](\d{2})?)(?=\s|$)/i;
const AT_TIME = /(?:^|\s)(?:às|as|a partir das|ao meio-dia|meio-dia)\s*(\d{1,2})?(?:[h:](\d{2})?)?(?=\s|$)/i;
const CLOCK = /(?:^|\s)(\d{1,2}):(\d{2})(?=\s|$)|(?:^|\s)(\d{1,2})h(\d{2})?(?=\s|$)/i;

function parseMoney(raw: string): number | null {
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(?:\.\d{3})+$/.test(raw) ? raw.replace(/\./g, "") : raw;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;
}

function clock(hours: number, minutes = 0): string | null {
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function addMinutes(time: string, minutes: number): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + minutes);
  return clock(Math.floor(total / 60), total % 60)!;
}

function tidyTitle(text: string): string {
  const cleaned = text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:no|na|nos|nas|em|com|de|do|da|dos|das|pro|pra|pelo|pela|o|a)\s+/i, "")
    .replace(/\s+(?:no|na|em|de|do|da|com|às|as|e)$/i, "")
    .trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : "";
}

/** Extrai horário de compromisso: "às 15h", "15:30", "das 14h às 16h", "16h" (acima de 8h, para não confundir com duração). */
function extractTime(text: string): { start: string; end?: string; rest: string } | null {
  const range = text.match(RANGE);
  if (range) {
    const start = clock(Number(range[1]), Number(range[2] ?? 0));
    const end = clock(Number(range[3]), Number(range[4] ?? 0));
    if (start && end && end > start) return { start, end, rest: text.replace(range[0], " ") };
  }
  const at = text.match(AT_TIME);
  if (at && (at[1] || /meio-dia/i.test(at[0]))) {
    const start = at[1] ? clock(Number(at[1]), Number(at[2] ?? 0)) : "12:00";
    if (start) return { start, rest: text.replace(at[0], " ") };
  }
  const plain = text.match(CLOCK);
  if (plain) {
    const hours = Number(plain[1] ?? plain[3]);
    const minutes = Number(plain[2] ?? plain[4] ?? 0);
    // "1h30" sem "às" é duração; "14h" ou "9:30" é horário.
    if (plain[1] !== undefined || hours > 8) {
      const start = clock(hours, minutes);
      if (start) return { start, rest: text.replace(plain[0], " ") };
    }
  }
  return null;
}

export function parseQuickCapture(input: string, today = localDateKey(), forcedKind?: CaptureKind): QuickCapture {
  let text = input.trim();
  let kind: CaptureKind | null = null;
  let explicit = false;

  const prefix = text.match(/^([\p{L} ]{3,20}?)\s*[:\-–]\s+/u);
  const prefixKind = prefix ? PREFIXES.find(([regex]) => regex.test(prefix[1]!.trim().toLowerCase()))?.[1] : undefined;
  if (prefix && prefixKind) {
    kind = prefixKind;
    explicit = true;
    text = text.slice(prefix[0].length);
  } else if (/^ideia\s+(?:de|para|pra)\s+/i.test(text)) {
    kind = "idea";
    explicit = true;
    text = text.replace(/^ideia\s+/i, "");
  } else if (SHOPPING_SUFFIX.test(` ${text}`)) {
    kind = "shopping";
    explicit = true;
    text = ` ${text}`.replace(SHOPPING_SUFFIX, "").replace(/^\s*(?:comprar|pôr|por|colocar|adicionar|add)\s+/i, "");
  }

  // Tipo escolhido pela pessoa na interface vale mais que o deduzido.
  if (forcedKind) {
    kind = forcedKind;
    explicit = true;
  }

  // Dinheiro: "R$ 40", "40 reais"; número solto só quando há verbo de gasto/recebimento.
  let amount: number | undefined;
  const pastExpense = EXPENSE_VERB.test(text);
  const pastIncome = INCOME_VERB.test(text);
  const money = text.match(MONEY);
  let moneyText: string | undefined;
  if (money) {
    amount = parseMoney(money[1] ?? money[2]!) ?? undefined;
    moneyText = money[0];
  } else if (pastExpense || pastIncome || kind === "expense" || kind === "income") {
    const bare = text.match(BARE_NUMBER);
    if (bare) {
      amount = parseMoney(bare[1]!) ?? undefined;
      moneyText = bare[0];
    }
  }
  if (kind === null && amount !== undefined && (pastExpense || pastIncome)) kind = pastIncome && !pastExpense ? "income" : "expense";
  // O valor só sai do título numa transação ("Pagar boleto R$ 300 sexta" continua tarefa com o valor no nome).
  if ((kind === "expense" || kind === "income") && moneyText) text = text.replace(moneyText, " ").replace(kind === "income" ? INCOME_VERB : EXPENSE_VERB, " ");

  // Horário: com hora, é compromisso (salvo quando o tipo já foi escolhido).
  let start: string | undefined;
  let end: string | undefined;
  if (kind === null || kind === "event") {
    const time = extractTime(` ${text} `);
    if (time) {
      start = time.start;
      end = time.end;
      text = time.rest;
      kind = "event";
    }
  }
  kind ??= "task";

  // Transações podem ser do passado: "ontem", "anteontem".
  let pastDate: string | undefined;
  if (kind === "expense" || kind === "income") {
    const past = ` ${text} `.match(/\s(anteontem|ontem)(?=\s)/i);
    if (past) {
      pastDate = addDaysToKey(today, past[1]!.toLowerCase() === "ontem" ? -1 : -2);
      text = ` ${text} `.replace(past[0], " ");
    }
  }

  // Data, prioridade, tags e duração: mesmo entendimento da adição rápida de tarefas.
  const parsed = parseQuickTask(text, today);
  const title = tidyTitle(parsed.title);
  const capture: QuickCapture = { kind, title, tags: parsed.tags, explicit };

  if (kind === "task") {
    return { ...capture, title: parsed.title, date: parsed.dueDate, priority: parsed.priority, estimatedMinutes: parsed.estimatedMinutes, amount };
  }
  if (kind === "event") {
    // Sem horário ("Compromisso: congresso sexta"), vira compromisso de dia inteiro.
    return { ...capture, date: parsed.dueDate ?? today, start, end: end ?? (start ? addMinutes(start, parsed.estimatedMinutes ?? 60) : undefined) };
  }
  if (kind === "expense" || kind === "income") return { ...capture, date: pastDate ?? parsed.dueDate ?? today, amount };
  // Nota, ideia e item de lista guardam o texto como foi escrito.
  const raw = text.replace(/\s+/g, " ").trim();
  return { ...capture, title: raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "" };
}

export function captureKindInfo(kind: CaptureKind) {
  return CAPTURE_KINDS.find((item) => item.kind === kind)!;
}

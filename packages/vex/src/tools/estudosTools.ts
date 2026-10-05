import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  createFlashcard,
  createNotebook,
  createQuiz,
  createSummary,
  deleteNotebook,
  listAssessments,
  listDueFlashcards,
  listFlashcards,
  listNotebooks,
  listQuizzes,
  listSummaries,
  parseGeneratedQuiz,
  QUIZ_QUESTION_COUNT,
  type Notebook,
} from "@qqorvex/module-estudos";
import type { ToolDefinition, VexProvider } from "../types";
import { ambiguousSummary, formatDateKey, localDateKey, matchByName } from "./shared";

/**
 * Conteúdo-fonte do quiz cabe numa mensagem da `vex-chat` (limite de 12 mil caracteres por
 * mensagem, junto com as instruções). Cadernos maiores usam os resumos mais recentes até o limite.
 */
const QUIZ_SOURCE_MAX_CHARS = 9_000;
const MAX_FLASHCARDS_PER_CALL = 20;

const QUIZ_GENERATION_PROMPT = `Gere exatamente ${QUIZ_QUESTION_COUNT} perguntas de múltipla escolha sobre o conteúdo abaixo, em português do Brasil, cada uma com exatamente 4 alternativas (só uma certa). Varie a posição da alternativa certa e cubra partes diferentes do conteúdo.

Responda APENAS com um JSON válido neste formato exato, sem nenhum texto antes ou depois:
{"questions":[{"questionText":"...","options":["...","...","...","..."],"correctOptionIndex":0}]}

Conteúdo-fonte:
`;

function notFound(name: unknown): string {
  return `Não encontrei nenhum Caderno parecido com "${String(name ?? "")}". Quer que eu crie um Caderno novo com esse nome primeiro?`;
}

/** Fonte do quiz: resumos do caderno (na ordem recebida) até o limite de tamanho. */
export function buildQuizSource(summaries: { title: string; content: string }[], maxChars = QUIZ_SOURCE_MAX_CHARS): string {
  let source = "";
  for (const summary of summaries) {
    const block = `${summary.title}\n${summary.content}`.trim();
    if (!block) continue;
    const next = source ? `${source}\n\n${block}` : block;
    if (next.length > maxChars) {
      if (!source) source = block.slice(0, maxChars);
      break;
    }
    source = next;
  }
  return source;
}

/** Normaliza a lista de flashcards vinda do modelo: frente/verso com texto, sem repetidos, no máximo 20. */
export function cleanFlashcardDrafts(value: unknown): { front: string; back: string }[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const cards: { front: string; back: string }[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const front = String((item as Record<string, unknown>).front ?? "").trim();
    const back = String((item as Record<string, unknown>).back ?? "").trim();
    const key = front.toLowerCase();
    if (!front || !back || seen.has(key)) continue;
    seen.add(key);
    cards.push({ front, back });
    if (cards.length === MAX_FLASHCARDS_PER_CALL) break;
  }
  return cards;
}

/**
 * Ferramentas da Vex para Estudos. Só chamam a API pública de `@qqorvex/module-estudos`.
 * `provider` só é usado por `generate_quiz_by_notebook_name` para uma segunda chamada dedicada,
 * sem tools, que gera o conteúdo do quiz como texto/JSON em vez de argumento de tool-call (mais
 * confiável que um schema aninhado grande como argumento).
 */
export function createEstudosTools(client: SupabaseClient<Database>, userId: string, provider: VexProvider): ToolDefinition[] {
  async function findNotebook(name: unknown): Promise<{ notebook: Notebook } | { summary: string }> {
    const match = matchByName(await listNotebooks(client), String(name ?? ""), (notebook) => notebook.name);
    if (match.kind === "none") return { summary: notFound(name) };
    if (match.kind === "many") return { summary: ambiguousSummary("um Caderno", match.items, (notebook) => notebook.name) };
    return { notebook: match.item };
  }

  return [
    {
      name: "list_notebooks",
      description: "Lista os Cadernos de Estudos do usuário",
      parameters: { type: "object", properties: {} },
      requiresConfirmation: false,
      async execute() {
        const notebooks = await listNotebooks(client);
        if (notebooks.length === 0) return { summary: "Você não tem Cadernos ainda." };
        const lines = notebooks.map((n) => `- ${n.name} (${n.status})`).join("\n");
        return { summary: `Seus Cadernos:\n${lines}`, data: notebooks };
      },
    },
    {
      name: "get_notebook_by_name",
      description:
        "Mostra o conteúdo de um Caderno pelo nome: resumos (com o texto), flashcards (total e quantos estão para revisar), quizzes e avaliações. Use para explicar, revisar ou tirar dúvidas sobre o que a pessoa estuda.",
      parameters: {
        type: "object",
        properties: { notebookName: { type: "string", description: "Nome (ou parte dele) do Caderno" } },
        required: ["notebookName"],
      },
      requiresConfirmation: false,
      async execute(args) {
        const found = await findNotebook(args.notebookName);
        if (!("notebook" in found)) return found;
        const { notebook } = found;
        const today = localDateKey();
        const [summaries, flashcards, quizzes, assessments] = await Promise.all([
          listSummaries(client, notebook.id),
          listFlashcards(client, notebook.id),
          listQuizzes(client, notebook.id),
          listAssessments(client, notebook.id),
        ]);
        const due = flashcards.filter((card) => card.next_review_date !== null && card.next_review_date <= today).length;
        const upcoming = assessments.flatMap((assessment) =>
          assessment.assessment_date && assessment.assessment_date >= today ? [{ name: assessment.name, date: assessment.assessment_date }] : [],
        );
        const lines = [
          `Caderno "${notebook.name}" (${notebook.status}).`,
          summaries.length ? `Resumos (${summaries.length}):\n${buildQuizSource(summaries, 6_000)}` : "Ainda sem resumos.",
          `Flashcards: ${flashcards.length} no total, ${due} para revisar hoje.`,
          `Quizzes: ${quizzes.length}.`,
          upcoming.length
            ? `Próximas avaliações: ${upcoming.map((assessment) => `${assessment.name} (${formatDateKey(assessment.date, today)})`).join("; ")}.`
            : "Sem avaliações marcadas.",
        ];
        return { summary: lines.join("\n\n"), data: { notebook, summaries: summaries.length, flashcards: flashcards.length, due, quizzes: quizzes.length } };
      },
    },
    {
      name: "create_notebook",
      description: "Cria um novo Caderno de Estudos",
      parameters: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const name = String(args.name ?? "").trim();
        if (!name) return { summary: "Não consegui criar o Caderno: nome vazio." };
        const notebook = await createNotebook(client, userId, { name });
        return { summary: `Caderno criado: "${notebook.name}".`, data: notebook };
      },
    },
    {
      name: "create_summary_by_notebook_name",
      description:
        "Prepara um Resumo de Estudos completo, organizado em Markdown e pronto para salvar dentro de um Caderno existente. Use depois de pesquisar ou reunir o conteúdo solicitado. Estruture com título, visão geral, seções explicativas, exemplos quando úteis e pontos-chave; inclua fontes confiáveis quando a pesquisa as fornecer e nunca invente referências. A pessoa verá somente o caderno, o título e um botão de confirmação — não envie o texto integral do resumo na conversa.",
      parameters: {
        type: "object",
        properties: {
          notebookName: { type: "string", description: "Nome (ou parte dele) do Caderno onde salvar", maxLength: 120 },
          title: { type: "string", description: "Título claro do Resumo", maxLength: 180 },
          content: { type: "string", description: "Resumo completo e formatado em Markdown (até 12 mil caracteres)", maxLength: 12_000 },
        },
        required: ["notebookName", "title", "content"],
      },
      requiresConfirmation: true,
      preview: (args) => ({
        title: "Adicionar resumo ao Caderno",
        fields: [
          { label: "Caderno", value: String(args.notebookName ?? "") },
          { label: "Título", value: String(args.title ?? "") },
        ],
        note: "O resumo completo e formatado será criado no Caderno depois que você confirmar.",
      }),
      async execute(args) {
        const title = String(args.title ?? "").trim();
        const content = String(args.content ?? "").trim();
        if (!title || !content) return { summary: "Não consegui criar o Resumo: título ou conteúdo vazio." };
        const found = await findNotebook(args.notebookName);
        if (!("notebook" in found)) return found;
        const summary = await createSummary(client, found.notebook.id, { title, content });
        return { summary: `Resumo "${summary.title}" criado no Caderno "${found.notebook.name}".`, data: summary };
      },
    },
    {
      name: "create_flashcard_by_notebook_name",
      description:
        "Cria UM flashcard (frente = pergunta, verso = resposta) dentro de um Caderno existente, pelo nome do Caderno. Ele entra na revisão espaçada a partir de hoje. Para vários de uma vez, use create_flashcards_by_notebook_name.",
      parameters: {
        type: "object",
        properties: {
          notebookName: { type: "string", description: "Nome (ou parte dele) do Caderno" },
          front: { type: "string", description: "Frente: a pergunta ou o termo" },
          back: { type: "string", description: "Verso: a resposta" },
        },
        required: ["notebookName", "front", "back"],
      },
      requiresConfirmation: true,
      preview: (args) => ({
        title: "Criar flashcard",
        fields: [
          { label: "Caderno", value: String(args.notebookName ?? "") },
          { label: "Frente", value: String(args.front ?? "") },
          { label: "Verso", value: String(args.back ?? "") },
        ],
      }),
      async execute(args) {
        const front = String(args.front ?? "").trim();
        const back = String(args.back ?? "").trim();
        if (!front || !back) return { summary: "Não criei o flashcard: frente e verso precisam de texto." };
        const found = await findNotebook(args.notebookName);
        if (!("notebook" in found)) return found;
        const flashcard = await createFlashcard(client, found.notebook.id, { front, back });
        return { summary: `Flashcard criado no Caderno "${found.notebook.name}": "${flashcard.front}".`, data: flashcard };
      },
    },
    {
      name: "create_flashcards_by_notebook_name",
      description: `Cria vários flashcards (até ${MAX_FLASHCARDS_PER_CALL}) de uma vez num Caderno existente — use para "transforme este resumo/assunto em flashcards". Cada um com frente (pergunta curta) e verso (resposta objetiva).`,
      parameters: {
        type: "object",
        properties: {
          notebookName: { type: "string", description: "Nome (ou parte dele) do Caderno" },
          cards: {
            type: "array",
            description: `De 1 a ${MAX_FLASHCARDS_PER_CALL} flashcards`,
            items: {
              type: "object",
              properties: {
                front: { type: "string", description: "Pergunta ou termo" },
                back: { type: "string", description: "Resposta" },
              },
              required: ["front", "back"],
            },
          },
        },
        required: ["notebookName", "cards"],
      },
      requiresConfirmation: true,
      preview: (args) => {
        const cards = cleanFlashcardDrafts(args.cards);
        return {
          title: `Criar ${cards.length} flashcard${cards.length === 1 ? "" : "s"}`,
          fields: [
            { label: "Caderno", value: String(args.notebookName ?? "") },
            ...cards.map((card, index) => ({ label: `${index + 1}.`, value: `${card.front} → ${card.back}` })),
          ],
        };
      },
      async execute(args) {
        const cards = cleanFlashcardDrafts(args.cards);
        if (cards.length === 0) return { summary: "Não criei flashcards: nenhum veio com frente e verso preenchidos." };
        const found = await findNotebook(args.notebookName);
        if (!("notebook" in found)) return found;
        for (const card of cards) await createFlashcard(client, found.notebook.id, card);
        return { summary: `${cards.length} flashcard${cards.length === 1 ? " criado" : "s criados"} no Caderno "${found.notebook.name}". Eles já entram na revisão de hoje.` };
      },
    },
    {
      name: "generate_quiz_by_notebook_name",
      description: `Gera um Quiz de ${QUIZ_QUESTION_COUNT} perguntas de múltipla escolha num Caderno existente, a partir dos Resumos dele. Se a pessoa pedir um quiz sobre um assunto da conversa (ou o Caderno ainda não tiver Resumos), passe o conteúdo em sourceText. A pessoa responde o quiz no Caderno, em Estudos.`,
      parameters: {
        type: "object",
        properties: {
          notebookName: { type: "string", description: "Nome (ou parte dele) do Caderno onde o quiz fica salvo" },
          sourceText: { type: "string", description: "Opcional: conteúdo de onde tirar as perguntas, em vez dos Resumos do Caderno" },
        },
        required: ["notebookName"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const found = await findNotebook(args.notebookName);
        if (!("notebook" in found)) return found;
        const { notebook } = found;

        const provided = String(args.sourceText ?? "").trim();
        const sourceContent = provided ? provided.slice(0, QUIZ_SOURCE_MAX_CHARS) : buildQuizSource(await listSummaries(client, notebook.id));
        if (!sourceContent) {
          return { summary: `O Caderno "${notebook.name}" ainda não tem Resumos. Posso gerar o quiz a partir de um assunto se a pessoa disser qual (ou criar um Resumo primeiro).` };
        }

        // Até duas tentativas: o modelo às vezes devolve um JSON incompleto na primeira.
        let questions: ReturnType<typeof parseGeneratedQuiz> = null;
        for (let attempt = 0; attempt < 2 && !questions; attempt += 1) {
          const response = await provider.chat({ messages: [{ role: "user", content: `${QUIZ_GENERATION_PROMPT}${sourceContent}` }], tools: [] });
          if (response.kind === "message") questions = parseGeneratedQuiz(response.content);
        }
        if (!questions) {
          return { summary: "Não consegui gerar um Quiz válido a partir desse conteúdo agora. Pode tentar de novo em instantes." };
        }

        const quiz = await createQuiz(client, notebook.id, `Quiz — ${notebook.name}`, questions);
        return { summary: `Quiz com ${questions.length} perguntas gerado no Caderno "${notebook.name}". A pessoa responde em Estudos → ${notebook.name} → Quizzes.`, data: quiz };
      },
    },
    {
      name: "delete_notebook_by_name",
      description: "Apaga um Caderno de Estudos pelo nome (resumos e flashcards relacionados são apagados junto, em cascata)",
      parameters: {
        type: "object",
        properties: { name: { type: "string", description: "Nome (ou parte dele) do Caderno" } },
        required: ["name"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const found = await findNotebook(args.name);
        if (!("notebook" in found)) return found;
        await deleteNotebook(client, found.notebook.id);
        return { summary: `Caderno apagado: "${found.notebook.name}".` };
      },
    },
    {
      name: "list_due_flashcards",
      description: "Conta quantos flashcards estão prontos para revisão hoje, em todos os Cadernos",
      parameters: { type: "object", properties: {} },
      requiresConfirmation: false,
      async execute() {
        const flashcards = await listDueFlashcards(client, localDateKey());
        if (flashcards.length === 0) return { summary: "Nenhum flashcard para revisar hoje." };
        return { summary: `Você tem ${flashcards.length} flashcard(s) para revisar hoje. A revisão é feita em Estudos, dentro de cada Caderno.`, data: flashcards };
      },
    },
  ];
}

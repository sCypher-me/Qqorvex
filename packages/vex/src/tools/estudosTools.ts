import type { SupabaseClient, Database } from "@qqorvex/database";
import {
  createFlashcard,
  createNotebook,
  createQuiz,
  createSummary,
  deleteNotebook,
  listDueFlashcards,
  listNotebooks,
  listSummaries,
  parseGeneratedQuiz,
  QUIZ_QUESTION_COUNT,
} from "@qqorvex/module-estudos";
import type { ToolDefinition, VexProvider } from "../types";
import { ambiguousSummary, localDateKey, matchByName } from "./shared";

const QUIZ_GENERATION_PROMPT = `Gere exatamente ${QUIZ_QUESTION_COUNT} perguntas de múltipla escolha sobre o conteúdo abaixo, cada uma com exatamente 4 alternativas (só uma certa).

Responda APENAS com um JSON válido neste formato exato, sem nenhum texto antes ou depois:
{"questions":[{"questionText":"...","options":["...","...","...","..."],"correctOptionIndex":0}]}

Conteúdo-fonte:
`;

/**
 * Ferramentas da Vex para Estudos. Só chamam a API pública de `@qqorvex/module-estudos`.
 * `provider` só é usado por `generate_quiz_by_notebook_name` (Quiz/Testes gerados) para uma
 * segunda chamada dedicada, sem tools, que gera o
 * conteúdo do quiz como texto/JSON em vez de argumento de tool-call (mais confiável com modelos
 * locais pequenos para schemas aninhados grandes).
 */
export function createEstudosTools(client: SupabaseClient<Database>, userId: string, provider: VexProvider): ToolDefinition[] {
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
        "Cria um Resumo dentro de um Caderno existente, pelo nome do Caderno — use quando o usuário pedir para salvar algo pesquisado/discutido na conversa como Resumo de Estudos",
      parameters: {
        type: "object",
        properties: {
          notebookName: { type: "string", description: "Nome (ou parte dele) do Caderno onde salvar" },
          title: { type: "string", description: "Título do Resumo" },
          content: { type: "string", description: "Conteúdo (texto) do Resumo" },
        },
        required: ["notebookName", "title", "content"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const query = String(args.notebookName ?? "")
          .trim()
          .toLowerCase();
        const title = String(args.title ?? "").trim();
        const content = String(args.content ?? "").trim();
        if (!title || !content) return { summary: "Não consegui criar o Resumo: título ou conteúdo vazio." };
        const notebooks = await listNotebooks(client);
        const notebook = notebooks.find((n) => n.name.toLowerCase().includes(query));
        if (!notebook) {
          return {
            summary: `Não encontrei nenhum Caderno parecido com "${args.notebookName}". Quer que eu crie um Caderno novo com esse nome primeiro?`,
          };
        }
        const summary = await createSummary(client, notebook.id, { title, content });
        return { summary: `Resumo "${summary.title}" criado no Caderno "${notebook.name}".`, data: summary };
      },
    },
    {
      name: "create_flashcard_by_notebook_name",
      description:
        "Cria um flashcard (frente = pergunta, verso = resposta) dentro de um Caderno existente, pelo nome do Caderno. Ele entra na revisão espaçada a partir de hoje.",
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
        const match = matchByName(await listNotebooks(client), String(args.notebookName ?? ""), (notebook) => notebook.name);
        if (match.kind === "none") return { summary: `Não encontrei nenhum Caderno parecido com "${args.notebookName}". Quer que eu crie um Caderno novo com esse nome primeiro?` };
        if (match.kind === "many") return { summary: ambiguousSummary("um Caderno", match.items, (notebook) => notebook.name) };
        const flashcard = await createFlashcard(client, match.item.id, { front, back });
        return { summary: `Flashcard criado no Caderno "${match.item.name}": "${flashcard.front}".`, data: flashcard };
      },
    },
    {
      name: "generate_quiz_by_notebook_name",
      description: `Gera um Quiz de ${QUIZ_QUESTION_COUNT} perguntas de múltipla escolha a partir dos Resumos de um Caderno existente, pelo nome do Caderno`,
      parameters: {
        type: "object",
        properties: {
          notebookName: { type: "string", description: "Nome (ou parte dele) do Caderno" },
        },
        required: ["notebookName"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const query = String(args.notebookName ?? "")
          .trim()
          .toLowerCase();
        const notebooks = await listNotebooks(client);
        const notebook = notebooks.find((n) => n.name.toLowerCase().includes(query));
        if (!notebook) return { summary: `Não encontrei nenhum Caderno parecido com "${args.notebookName}".` };

        const summaries = await listSummaries(client, notebook.id);
        if (summaries.length === 0) {
          return { summary: `O Caderno "${notebook.name}" ainda não tem nenhum Resumo — preciso de pelo menos um para gerar o Quiz.` };
        }
        const sourceContent = summaries.map((s) => `${s.title}\n${s.content}`).join("\n\n");

        const response = await provider.chat({
          messages: [{ role: "user", content: `${QUIZ_GENERATION_PROMPT}${sourceContent}` }],
          tools: [],
        });
        if (response.kind !== "message") {
          return { summary: "Não consegui gerar o Quiz — o modelo tentou usar uma ferramenta em vez de responder com o conteúdo." };
        }
        const questions = parseGeneratedQuiz(response.content);
        if (!questions) {
          return { summary: "Não consegui gerar um Quiz válido a partir desse conteúdo. Pode tentar de novo?" };
        }

        const quiz = await createQuiz(client, notebook.id, `Quiz — ${notebook.name}`, questions);
        return { summary: `Quiz gerado no Caderno "${notebook.name}" com ${questions.length} perguntas.`, data: quiz };
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
        const query = String(args.name ?? "")
          .trim()
          .toLowerCase();
        const notebooks = await listNotebooks(client);
        const match = notebooks.find((n) => n.name.toLowerCase().includes(query));
        if (!match) return { summary: `Não encontrei nenhum Caderno parecido com "${args.name}".` };
        await deleteNotebook(client, match.id);
        return { summary: `Caderno apagado: "${match.name}".` };
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
        return { summary: `Você tem ${flashcards.length} flashcard(s) para revisar hoje.`, data: flashcards };
      },
    },
  ];
}

import { searchEverything, type SearchKind, type SupabaseClient, type Database } from "@qqorvex/database";
import type { ToolDefinition } from "../types";

const KIND_LABEL: Record<SearchKind, string> = {
  tarefa: "Tarefa",
  evento: "Evento",
  nota: "Nota",
  resumo: "Resumo",
  flashcard: "Flashcard",
  caderno: "Caderno",
  meta: "Meta",
  habito: "Hábito",
  biblioteca: "Biblioteca",
  documento: "Documento",
  lancamento: "Lançamento",
  ideia: "Ideia",
};

/**
 * Busca em tudo (títulos e conteúdo, sem acento) pela mesma função do Ctrl K. O Cofre nunca
 * aparece — a regra está na própria função `search_everything` do banco.
 */
export function createBuscaTools(client: SupabaseClient<Database>): ToolDefinition[] {
  return [
    {
      name: "search_everything",
      label: "Busca",
      description:
        "Procura um termo em todas as áreas do app ao mesmo tempo (tarefas, agenda, notas e o texto delas, resumos, flashcards, metas, hábitos, biblioteca, documentos e texto extraído, lançamentos, ideias). Use quando a pessoa perguntar onde anotou/guardou algo ou pedir para achar alguma coisa sem dizer a área.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Termo a procurar (2 caracteres ou mais)" } },
        required: ["query"],
      },
      requiresConfirmation: false,
      async execute(args) {
        const query = String(args.query ?? "").trim();
        if (query.length < 2) return { summary: "Preciso de um termo com pelo menos 2 caracteres para buscar." };
        const results = await searchEverything(client, query, 5);
        if (results.length === 0) return { summary: `Não encontrei nada com "${query}".` };
        const lines = results.map((result) => `- [${KIND_LABEL[result.kind]}] ${result.title}${result.snippet ? ` — ${result.snippet}` : ""}`);
        return { summary: `Resultados para "${query}":\n${lines.join("\n")}`, data: results };
      },
    },
  ];
}

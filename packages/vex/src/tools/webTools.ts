import type { SupabaseClient, Database } from "@qqorvex/database";
import type { ToolDefinition } from "../types";

/**
 * Única ferramenta que sai do Qqorvex — todas as outras só falam com repositories dos módulos.
 * Somente leitura (nunca precisa de confirmação): buscar não altera nada. A chave da Tavily fica
 * em `app_secrets`, lida só pela Edge Function `vex-web-search`, nunca no cliente.
 */
export function createWebTools(client: SupabaseClient<Database>): ToolDefinition[] {
  return [
    {
      name: "search_web",
      description: "Busca informação atual na internet quando a pergunta não pode ser respondida só com dados do app (notícias, preços, fatos gerais, algo que aconteceu recentemente)",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "O que buscar" } },
        required: ["query"],
      },
      requiresConfirmation: false,
      async execute(args) {
        const query = String(args.query ?? "").trim();
        if (!query) return { summary: "Preciso saber o que buscar." };

        const { data, error } = await client.functions.invoke("vex-web-search", { body: { query } });
        if (error) return { summary: "Não consegui buscar na internet agora." };

        const results: Array<{ title: string; url: string; content: string }> = data?.results ?? [];
        if (results.length === 0) return { summary: `Não encontrei nada sobre "${query}".` };

        const lines = results.slice(0, 5).map((r) => `- ${r.title}: ${r.content} (${r.url})`).join("\n");
        const answer = data?.answer ? `${data.answer}\n\n` : "";
        return { summary: `${answer}Fontes:\n${lines}`, data: results };
      },
    },
  ];
}

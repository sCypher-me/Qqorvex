import type { SupabaseClient, Database } from "@qqorvex/database";
import { archivePage, createBlock, createPage, listPages } from "@qqorvex/module-segundo-cerebro";
import type { ToolDefinition } from "../types";
import { ambiguousSummary, matchByName } from "./shared";

/** Ferramentas da Vex para o Segundo Cérebro. Só chamam a API pública de `@qqorvex/module-segundo-cerebro`. */
export function createSegundoCerebroTools(client: SupabaseClient<Database>, userId: string): ToolDefinition[] {
  return [
    {
      name: "list_pages",
      description: "Lista as páginas do Segundo Cérebro",
      parameters: { type: "object", properties: {} },
      requiresConfirmation: false,
      async execute() {
        const pages = await listPages(client);
        if (pages.length === 0) return { summary: "Você não tem páginas ainda." };
        const lines = pages.map((p) => `- ${p.title}`).join("\n");
        return { summary: `Suas páginas:\n${lines}`, data: pages };
      },
    },
    {
      name: "create_page",
      description: "Cria uma nova página no Segundo Cérebro",
      parameters: {
        type: "object",
        properties: { title: { type: "string" } },
        required: ["title"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const title = String(args.title ?? "").trim();
        if (!title) return { summary: "Não consegui criar a página: título vazio." };
        const page = await createPage(client, userId, { title });
        return { summary: `Página criada: "${page.title}".`, data: page };
      },
    },
    {
      name: "create_page_with_content",
      description:
        "Cria uma nova página no Segundo Cérebro já com um bloco de texto — use quando o usuário pedir para salvar algo que foi pesquisado/discutido na conversa (o conteúdo pesquisado vai no parâmetro content). Se o conteúdo veio de pesquisa na internet, marque research=true e passe as fontes usadas (sources); no texto, indique a fonte junto das afirmações importantes ([1], [2]…) e sinalize o que for incerto ou divergente entre fontes",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título da página" },
          content: { type: "string", description: "Conteúdo (texto) a salvar na página" },
          research: { type: "boolean", description: "true quando o conteúdo veio de pesquisa na internet" },
          sources: { type: "array", items: { type: "string" }, description: "Fontes, uma por item, no formato 'Título — https://…', na mesma ordem das referências [1], [2]…" },
        },
        required: ["title", "content"],
      },
      requiresConfirmation: true,
      // Pesquisa salva sem fonte não passa: referências são obrigatórias nos materiais de pesquisa.
      validate: (args) => {
        if (args.research !== true) return null;
        const sources = Array.isArray(args.sources) ? args.sources.filter((source) => typeof source === "string" && /https?:\/\//.test(source)) : [];
        return sources.length > 0 ? null : "uma pesquisa salva precisa das fontes (sources) com link";
      },
      async execute(args) {
        const title = String(args.title ?? "").trim();
        const content = String(args.content ?? "").trim();
        if (!title || !content) return { summary: "Não consegui criar a página: título ou conteúdo vazio." };
        const sources = Array.isArray(args.sources) ? args.sources.map((source) => String(source).trim()).filter(Boolean) : [];
        const page = await createPage(client, userId, { title });
        await createBlock(client, page.id, "texto", { text: content }, 0);
        if (sources.length > 0) {
          await createBlock(client, page.id, "texto", { text: `Fontes\n${sources.map((source, index) => `[${index + 1}] ${source}`).join("\n")}` }, 1);
        }
        return { summary: `Página criada com conteúdo${sources.length ? ` e ${sources.length} ${sources.length === 1 ? "fonte" : "fontes"}` : ""}: "${page.title}".`, data: page };
      },
    },
    {
      name: "archive_page_by_title",
      description: "Arquiva uma página do Segundo Cérebro pelo título (a página continua existindo, só some das listagens ativas)",
      parameters: {
        type: "object",
        properties: { title: { type: "string", description: "Título (ou parte dele) da página" } },
        required: ["title"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const match = matchByName(await listPages(client), String(args.title ?? ""), (page) => page.title);
        if (match.kind === "none") return { summary: `Não encontrei nenhuma página parecida com "${args.title}".` };
        if (match.kind === "many") return { summary: ambiguousSummary("uma página", match.items, (page) => page.title) };
        const archived = await archivePage(client, match.item.id, true);
        return { summary: `Página arquivada: "${archived.title}".`, data: archived };
      },
    },
  ];
}

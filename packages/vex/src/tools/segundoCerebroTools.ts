import type { SupabaseClient, Database } from "@qqorvex/database";
import { archivePage, createBlock, createPage, listPages } from "@qqorvex/module-segundo-cerebro";
import type { ToolDefinition } from "../types";

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
        "Cria uma nova página no Segundo Cérebro já com um bloco de texto — use quando o usuário pedir para salvar algo que foi pesquisado/discutido na conversa (o conteúdo pesquisado vai no parâmetro content)",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título da página" },
          content: { type: "string", description: "Conteúdo (texto) a salvar na página" },
        },
        required: ["title", "content"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const title = String(args.title ?? "").trim();
        const content = String(args.content ?? "").trim();
        if (!title || !content) return { summary: "Não consegui criar a página: título ou conteúdo vazio." };
        const page = await createPage(client, userId, { title });
        await createBlock(client, page.id, "texto", { text: content }, 0);
        return { summary: `Página criada com conteúdo: "${page.title}".`, data: page };
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
        const query = String(args.title ?? "")
          .trim()
          .toLowerCase();
        const pages = await listPages(client);
        const match = pages.find((p) => p.title.toLowerCase().includes(query));
        if (!match) return { summary: `Não encontrei nenhuma página parecida com "${args.title}".` };
        const archived = await archivePage(client, match.id, true);
        return { summary: `Página arquivada: "${archived.title}".`, data: archived };
      },
    },
  ];
}

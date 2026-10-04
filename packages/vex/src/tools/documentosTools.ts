import type { SupabaseClient, Database } from "@qqorvex/database";
import { listDocuments, toggleImportant, uploadDocument } from "@qqorvex/module-documentos";
import type { ToolDefinition } from "../types";
import { ambiguousSummary, matchByName } from "./shared";

/**
 * Ferramentas da Vex para Documentos & Arquivos. Só chamam a API pública de
 * `@qqorvex/module-documentos`. `userId` só é usado por `create_text_document` (Fase 6 —
 * "pesquisa + salvar depois"); as demais ferramentas deste módulo não precisavam dele.
 *
 * Barreira do Cofre (no servidor desde a migration vault_server_lock): com o Cofre bloqueado a
 * API nem devolve documentos do Cofre. `list_documents` ainda filtra `is_vault` por garantia — a
 * Vex nunca lista o Cofre. Para tocar um documento do Cofre, a ferramenta recebe o PIN, desbloqueia
 * só pelo tempo da ação (`unlockVault`, PIN conferido no servidor) e volta a bloquear se o Cofre
 * estava fechado antes.
 */
export function createDocumentosTools(client: SupabaseClient<Database>, userId: string): ToolDefinition[] {
  return [
    {
      name: "list_documents",
      description: "Lista os documentos/arquivos do usuário (documentos do Cofre nunca aparecem aqui)",
      parameters: { type: "object", properties: {} },
      requiresConfirmation: false,
      async execute() {
        const documents = (await listDocuments(client)).filter((d) => !d.is_vault);
        if (documents.length === 0) return { summary: "Você não tem documentos ainda." };
        const lines = documents.map((d) => `- [${d.document_type}] ${d.file_name}`).join("\n");
        return { summary: `Seus documentos:\n${lines}`, data: documents };
      },
    },
    {
      name: "create_text_document",
      description:
        "Cria um Documento de texto a partir de conteúdo — use quando o usuário pedir para salvar algo pesquisado/discutido na conversa como Documento",
      parameters: {
        type: "object",
        properties: {
          fileName: { type: "string", description: "Nome do arquivo, ex.: 'Anotações sobre X.txt'" },
          content: { type: "string", description: "Conteúdo (texto) do documento" },
        },
        required: ["fileName", "content"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const fileName = String(args.fileName ?? "").trim();
        const content = String(args.content ?? "").trim();
        if (!fileName || !content) return { summary: "Não consegui criar o documento: nome ou conteúdo vazio." };
        const blob = new Blob([content], { type: "text/plain" });
        const document = await uploadDocument(client, userId, blob, fileName, "outro");
        return { summary: `Documento criado: "${document.file_name}".`, data: document };
      },
    },
    {
      name: "toggle_important_by_name",
      description:
        "Marca ou desmarca um documento como importante, pelo nome do arquivo. Documentos do Cofre só aparecem enquanto o Cofre estiver aberto (a pessoa abre em Documentos com o PIN). Nunca peça nem aceite o PIN do Cofre na conversa.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome (ou parte dele) do arquivo" },
          isImportant: { type: "boolean", description: "true para marcar como importante, false para desmarcar" },
        },
        required: ["name", "isImportant"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const match = matchByName(await listDocuments(client), String(args.name ?? ""), (document) => document.file_name);
        if (match.kind === "none") {
          return {
            summary: `Não encontrei nenhum documento parecido com "${args.name}". Se ele estiver no Cofre, a pessoa precisa abrir o Cofre em Documentos (com o PIN, fora da conversa) e pedir de novo.`,
          };
        }
        if (match.kind === "many") return { summary: ambiguousSummary("um documento", match.items, (document) => document.file_name) };
        const updated = await toggleImportant(client, match.item.id, Boolean(args.isImportant));
        return {
          summary: `Documento "${updated.file_name}" ${updated.is_important ? "marcado como importante" : "desmarcado"}.`,
          data: updated,
        };
      },
    },
  ];
}

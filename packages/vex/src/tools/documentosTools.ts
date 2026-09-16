import type { SupabaseClient, Database } from "@qqorvex/database";
import { listDocuments, toggleImportant, uploadDocument } from "@qqorvex/module-documentos";
import { verifySecurityPin } from "@qqorvex/auth";
import type { ToolDefinition } from "../types";

/**
 * Ferramentas da Vex para Documentos & Arquivos. Só chamam a API pública de
 * `@qqorvex/module-documentos`. `userId` só é usado por `create_text_document` (Fase 6 —
 * "pesquisa + salvar depois"); as demais ferramentas deste módulo não precisavam dele.
 *
 * Fase 7 — Barreira do Cofre, evoluída pela Central de Segurança (docs/decisions/
 * central-seguranca-pin-design.md): `list_documents` continua sempre excluindo documentos com
 * `is_vault: true` — a Vex nunca lista o Cofre. Tocar um documento específico do Cofre já
 * conhecido pelo nome agora é possível, mas só com o PIN correto (verificado no servidor via
 * `verifySecurityPin`, nunca comparado aqui) — sem PIN, a ferramenta recusa e pede.
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
        "Marca ou desmarca um documento como importante, pelo nome do arquivo. Se o documento estiver no Cofre, precisa do PIN do Cofre (pergunte ao usuário se ele disser que é um documento do Cofre ou se esta ferramenta recusar por causa disso)",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome (ou parte dele) do arquivo" },
          isImportant: { type: "boolean", description: "true para marcar como importante, false para desmarcar" },
          pin: { type: "string", description: "PIN do Cofre — só necessário se o documento estiver no Cofre" },
        },
        required: ["name", "isImportant"],
      },
      requiresConfirmation: true,
      async execute(args) {
        const query = String(args.name ?? "")
          .trim()
          .toLowerCase();
        const documents = await listDocuments(client);
        const match = documents.find((d) => d.file_name.toLowerCase().includes(query));
        if (!match) return { summary: `Não encontrei nenhum documento parecido com "${args.name}".` };

        if (match.is_vault) {
          const pin = args.pin ? String(args.pin).trim() : "";
          const isAuthorized = pin.length > 0 && (await verifySecurityPin(client, pin));
          if (!isAuthorized) return { summary: "Esse documento está no Cofre. Qual é o PIN do Cofre?" };
        }

        const updated = await toggleImportant(client, match.id, Boolean(args.isImportant));
        return {
          summary: `Documento "${updated.file_name}" ${updated.is_important ? "marcado como importante" : "desmarcado"}.`,
          data: updated,
        };
      },
    },
  ];
}

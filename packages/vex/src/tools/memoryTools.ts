import type { SupabaseClient, Database } from "@qqorvex/database";
import type { ToolDefinition } from "../types";
import { addVexMemory, deleteVexMemory, listVexMemories, VEX_MEMORY_LIMIT, VEX_MEMORY_MAX_CHARS } from "../memories";

/** Ferramentas da memória com consentimento (repositório e hooks em `../memories`). */
type Client = SupabaseClient<Database>;

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function createMemoryTools(client: Client): ToolDefinition[] {
  return [
    {
      name: "remember",
      label: "Memória",
      description:
        "Guarda uma preferência ou fato duradouro sobre a pessoa para as próximas conversas (ex.: 'prefere reuniões depois das 10h', 'estuda para o ENEM'). Use SOMENTE quando a pessoa pedir para lembrar/guardar algo ou disser 'sim' quando você perguntar se quer que lembre. Nunca guarde senhas, PIN, números de documentos, dados de saúde ou de terceiros por iniciativa própria.",
      parameters: {
        type: "object",
        properties: { content: { type: "string", description: "O que lembrar, em uma frase curta na terceira pessoa", maxLength: VEX_MEMORY_MAX_CHARS } },
        required: ["content"],
      },
      requiresConfirmation: true,
      preview: (args) => ({ title: "Lembrar nas próximas conversas", fields: [{ label: "Memória", value: String(args.content ?? "") }], note: "Você pode ver, editar ou apagar em Configurações → Aparência → Memória da Vex." }),
      async execute(args) {
        const content = String(args.content ?? "").trim();
        if (!content) return { summary: "Não guardei: a memória estava vazia.", ok: false };
        const existing = await listVexMemories(client);
        if (existing.length >= VEX_MEMORY_LIMIT) return { summary: `Não guardei: já há ${VEX_MEMORY_LIMIT} memórias. Apague alguma em Configurações → Aparência → Memória da Vex.`, ok: false };
        if (existing.some((memory) => normalize(memory.content) === normalize(content))) return { summary: "Isso já estava guardado; nada mudou." };
        await addVexMemory(client, content);
        return { summary: `Guardado para as próximas conversas: "${content}".` };
      },
    },
    {
      name: "list_memories",
      label: "Memória",
      description: "Lista o que a pessoa pediu para a Vex lembrar (quando ela perguntar o que você sabe/lembra sobre ela).",
      parameters: { type: "object", properties: {} },
      requiresConfirmation: false,
      async execute() {
        const memories = await listVexMemories(client);
        if (memories.length === 0) return { summary: "Nenhuma memória guardada.", data: [] };
        return { summary: memories.map((memory) => `- ${memory.content}`).join("\n"), data: memories };
      },
    },
    {
      name: "forget_memory",
      label: "Memória",
      description: "Apaga uma memória guardada quando a pessoa pedir para esquecer algo. Informe o texto (ou parte dele) da memória.",
      parameters: {
        type: "object",
        properties: { text: { type: "string", description: "Texto ou trecho da memória a esquecer" } },
        required: ["text"],
      },
      requiresConfirmation: true,
      preview: (args) => ({ title: "Esquecer memória", fields: [{ label: "Memória", value: String(args.text ?? "") }] }),
      async execute(args) {
        const text = normalize(String(args.text ?? "").trim());
        if (!text) return { summary: "Não apaguei: faltou dizer qual memória.", ok: false };
        const memories = await listVexMemories(client);
        const matches = memories.filter((memory) => normalize(memory.content).includes(text));
        if (matches.length === 0) return { summary: "Não encontrei essa memória; nada foi apagado.", ok: false };
        if (matches.length > 1) return { summary: `Há ${matches.length} memórias parecidas: ${matches.map((memory) => `"${memory.content}"`).join(", ")}. Diga qual apagar.`, ok: false };
        await deleteVexMemory(client, matches[0]!.id);
        return { summary: `Esqueci: "${matches[0]!.content}".` };
      },
    },
  ];
}

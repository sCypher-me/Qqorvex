import type { SupabaseClient, Database } from "@qqorvex/database";
import type { VexProvider, ToolDefinition } from "../types";
import { createAgendaTools } from "./agendaTools";
import { createBibliotecaTools } from "./bibliotecaTools";
import { createDocumentosTools } from "./documentosTools";
import { createEstudosTools } from "./estudosTools";
import { createFinancasTools } from "./financasTools";
import { createGamificacaoTools } from "./gamificacaoTools";
import { createHojeTools } from "./hojeTools";
import { createMetasHabitosTools } from "./metasHabitosTools";
import { createPerfilTools } from "./perfilTools";
import { createSegundoCerebroTools } from "./segundoCerebroTools";
import { createTarefasTools } from "./tarefasTools";
import { createVidaPessoalTools } from "./vidaPessoalTools";
import { createWebTools } from "./webTools";

export interface VexToolsOptions {
  tmdbApiKey?: string;
  includeWebSearch?: boolean;
}

/** Dá a cada ferramenta o rótulo da área quando ela não define um próprio ("Consultou Estudos"). */
function labeled(label: string, tools: ToolDefinition[]): ToolDefinition[] {
  return tools.map((tool) => (tool.label ? tool : { ...tool, label }));
}

/** Registro único: todo ponto de entrada autenticado recebe as mesmas capacidades. */
export function createVexTools(
  client: SupabaseClient<Database>,
  userId: string,
  provider: VexProvider,
  options: VexToolsOptions = {},
): ToolDefinition[] {
  const tools = [
    ...createHojeTools(client),
    ...labeled("Tarefas", createTarefasTools(client, userId)),
    ...labeled("Agenda", createAgendaTools(client, userId)),
    ...labeled("Metas & Hábitos", createMetasHabitosTools(client, userId)),
    ...labeled("Estudos", createEstudosTools(client, userId, provider)),
    ...labeled("Notas", createSegundoCerebroTools(client, userId)),
    ...labeled("Biblioteca", createBibliotecaTools(client, userId, { tmdbApiKey: options.tmdbApiKey })),
    ...labeled("Documentos", createDocumentosTools(client, userId)),
    ...labeled("Finanças", createFinancasTools(client, userId)),
    ...labeled("Vida pessoal", createVidaPessoalTools(client, userId)),
    ...labeled("Conquistas", createGamificacaoTools(client, userId)),
    ...labeled("Perfil", createPerfilTools(client, userId)),
  ];

  if (options.includeWebSearch !== false) tools.push(...labeled("Web", createWebTools(client)));
  return tools;
}

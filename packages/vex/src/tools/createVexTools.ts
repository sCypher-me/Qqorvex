import type { SupabaseClient, Database } from "@qqorvex/database";
import type { VexProvider, ToolDefinition } from "../types";
import { createAgendaTools } from "./agendaTools";
import { createBibliotecaTools } from "./bibliotecaTools";
import { createDocumentosTools } from "./documentosTools";
import { createEstudosTools } from "./estudosTools";
import { createFinancasTools } from "./financasTools";
import { createGamificacaoTools } from "./gamificacaoTools";
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

/** Registro único: todo ponto de entrada autenticado recebe as mesmas capacidades. */
export function createVexTools(
  client: SupabaseClient<Database>,
  userId: string,
  provider: VexProvider,
  options: VexToolsOptions = {},
): ToolDefinition[] {
  const tools = [
    ...createTarefasTools(client, userId),
    ...createAgendaTools(client, userId),
    ...createMetasHabitosTools(client, userId),
    ...createEstudosTools(client, userId, provider),
    ...createSegundoCerebroTools(client, userId),
    ...createBibliotecaTools(client, userId, { tmdbApiKey: options.tmdbApiKey }),
    ...createDocumentosTools(client, userId),
    ...createFinancasTools(client, userId),
    ...createVidaPessoalTools(client, userId),
    ...createGamificacaoTools(client, userId),
    ...createPerfilTools(client, userId),
  ];

  if (options.includeWebSearch !== false) tools.push(...createWebTools(client));
  return tools;
}

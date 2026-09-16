import type { Tables, TablesInsert, Json } from "@qqorvex/database";

/**
 * Segundo Cérebro é fonte de verdade de páginas, blocos, propriedades, bases, links internos,
 * backlinks, tags próprias e checkpoints (histórico de versões — ver
 * docs/decisions/segundo-cerebro-checkpoints-design.md). Editor de Blocos Rico implementado pra
 * 11 dos 19 tipos de bloco — ver docs/decisions/segundo-cerebro-editor-blocos-design.md. v1 lean:
 * sem Lixeira separada (usa is_archived) e sem múltiplas Views de Base nomeadas por Base —
 * adiáveis pelo Xmind ou de infraestrutura maior. Entidades de outros módulos (Tarefas, Cadernos,
 * Livros...) são sempre referenciadas, nunca duplicadas dentro daqui.
 */
export type Page = Tables<"pages">;
export type Block = Tables<"blocks">;
export type BlockType = Block["block_type"];
export type PageProperty = Tables<"page_properties">;
export type PagePropertyType = PageProperty["property_type"];
export type PageTag = Tables<"page_tags">;
export type PageLink = Tables<"page_links">;
export type Base = Tables<"bases">;
export type BasePage = Tables<"base_pages">;
export type BaseFormula = Tables<"base_formulas">;
export type PageCheckpoint = Tables<"page_checkpoints">;

export interface BlockSnapshot {
  blockType: BlockType;
  content: Record<string, unknown>;
  orderIndex: number;
}

/**
 * Editor de Blocos Rico v1 (docs/decisions/segundo-cerebro-editor-blocos-design.md) — 11 dos 19
 * valores do enum `block_type` têm forma de conteúdo e edição de verdade. 2ª rodada
 * (15/09/2026, ver mesmo design doc) adicionou imagem/arquivo/link, reaproveitando
 * `uploadDocument()`/`getDownloadUrl()` de `@qqorvex/module-documentos` — o Documento é sempre o
 * dono do arquivo, o bloco só guarda a referência (`documentId`), mesmo princípio do
 * `AttachDocumentPanel`. 3ª rodada (15/09/2026) adicionou referência de página — mesmo princípio
 * de referência, sem lib nova (reaproveita `usePages()` já existente). 4ª rodada (15/09/2026)
 * adicionou tabela — grid simples de strings, sem lib nova. 5ª rodada (15/09/2026) adicionou
 * equação — nova dependência `katex` (renderiza LaTeX no navegador, sem servidor). 6ª rodada
 * (15/09/2026) adicionou referência de entidade — v1 escopada só pra Tarefa (único módulo com um
 * hook pronto de "listar tudo", `useAllTasks()`; Eventos só tem `useEventsInRange()`, sem
 * equivalente — criar um só pra isso ficaria pra quando um segundo tipo de entidade for
 * adicionado). Sem rota de detalhe por Tarefa ainda, então é um resumo inline (não um link
 * navegável) — diferente de referência de página. 7ª rodada (15/09/2026) adicionou embed — nunca
 * renderiza um iframe de URL arbitrária (risco de segurança real, não só técnico); só URLs que
 * batem com uma lista fixa de provedores conhecidos (YouTube, Vimeo, Spotify, Figma, CodePen) são
 * convertidas pra sua URL de embed oficial e postas num iframe `sandbox`ado. Qualquer outra URL
 * mostra "Esse link não é suportado" em vez de tentar embutir. Com isso, o roteiro original dos
 * 19 tipos está completo, exceto mais tipos de entidade (Evento e outros, quando fizer sentido).
 */
export type EditableBlockType =
  | "texto"
  | "titulo1"
  | "titulo2"
  | "titulo3"
  | "lista"
  | "checklist"
  | "citacao"
  | "callout"
  | "codigo"
  | "divisor"
  | "toggle"
  | "imagem"
  | "arquivo"
  | "link"
  | "referencia_pagina"
  | "tabela"
  | "equacao"
  | "referencia_entidade"
  | "embed";

export const EDITABLE_BLOCK_TYPES: EditableBlockType[] = [
  "texto",
  "titulo1",
  "titulo2",
  "titulo3",
  "lista",
  "checklist",
  "citacao",
  "callout",
  "codigo",
  "divisor",
  "toggle",
  "imagem",
  "arquivo",
  "link",
  "referencia_pagina",
  "tabela",
  "equacao",
  "referencia_entidade",
  "embed",
];

export interface TextBlockContent {
  text: string;
}

export interface ChecklistBlockContent {
  text: string;
  checked: boolean;
}

export interface CodeBlockContent {
  text: string;
  language?: string;
}

export interface ToggleBlockContent {
  summary: string;
  details: string;
}

export type DividerBlockContent = Record<string, never>;

/** `documentId: null` = ainda não enviou nada; o Documento é sempre o dono do arquivo. */
export interface MediaBlockContent {
  documentId: string | null;
}

export interface LinkBlockContent {
  url: string;
}

/** `pageId: null` = ainda não escolheu; nunca duplica o título da página referenciada. */
export interface PageReferenceBlockContent {
  pageId: string | null;
}

/** Grid simples de strings — sem tipos de coluna nem fórmulas (isso já existe em Bases, propósito diferente). */
export interface TableBlockContent {
  columns: string[];
  rows: string[][];
}

/** Fonte LaTeX crua; renderizada com KaTeX no navegador, sem servidor. */
export interface EquationBlockContent {
  latex: string;
}

/**
 * "tarefa" (6ª rodada) e "evento" (8ª rodada, precisou de `listAllEvents`/`useAllEvents` novos em
 * `module-agenda`) — `entityType` continua um union aberto pra outros tipos entrarem depois.
 */
export type EntityReferenceType = "tarefa" | "evento";

export interface EntityReferenceBlockContent {
  entityType: EntityReferenceType | null;
  entityId: string | null;
}

/** URL crua como o usuário colou — nunca embutida direto; `resolveEmbedUrl()` em `service.ts` decide se/como. */
export interface EmbedBlockContent {
  url: string;
}

/** "Views de Base persistidas" — uma view por Base na v1 (não múltiplas views nomeadas). */
export interface BaseViewConfig {
  sortByProperty?: string;
  sortDirection?: "asc" | "desc";
  filterText?: string;
}

export function parseBaseViewConfig(base: Base): BaseViewConfig {
  return (base.view_config ?? {}) as BaseViewConfig;
}

export function toBaseViewConfigJson(config: BaseViewConfig): Json {
  return config as unknown as Json;
}

export interface NewPageInput {
  title: string;
  pageType?: string;
}

export function toPageInsert(userId: string, input: NewPageInput): TablesInsert<"pages"> {
  return {
    user_id: userId,
    title: input.title,
    page_type: input.pageType ?? "nota",
  };
}

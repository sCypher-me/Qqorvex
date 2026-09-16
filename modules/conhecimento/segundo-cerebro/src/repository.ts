import type { SupabaseClient, Database, Json } from "@qqorvex/database";
import { DAILY_NOTE_PAGE_TYPE, formatDailyNoteTitle } from "./service";
import type {
  Base,
  BaseFormula,
  BaseViewConfig,
  Block,
  BlockSnapshot,
  BlockType,
  Page,
  PageCheckpoint,
  PageLink,
  PageProperty,
  NewPageInput,
} from "./types";
import { toBaseViewConfigJson, toPageInsert } from "./types";

type Client = SupabaseClient<Database>;

export async function listPages(client: Client): Promise<Page[]> {
  const { data, error } = await client
    .from("pages")
    .select("*")
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPage(client: Client, pageId: string): Promise<Page> {
  const { data, error } = await client.from("pages").select("*").eq("id", pageId).single();
  if (error) throw error;
  return data;
}

export async function createPage(client: Client, userId: string, input: NewPageInput): Promise<Page> {
  const { data, error } = await client.from("pages").insert(toPageInsert(userId, input)).select("*").single();
  if (error) throw error;
  return data;
}

/**
 * "Nota do Dia dedicada" — idempotente por (usuário, tipo, data): reabrir no mesmo dia sempre
 * volta pra mesma página em vez de criar uma nova (mesmo padrão de `createEventForAssessment`).
 */
export async function getOrCreateDailyNote(client: Client, userId: string, date: Date): Promise<Page> {
  const title = formatDailyNoteTitle(date);
  const { data: existing, error: existingError } = await client
    .from("pages")
    .select("*")
    .eq("page_type", DAILY_NOTE_PAGE_TYPE)
    .eq("title", title)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  return createPage(client, userId, { title, pageType: DAILY_NOTE_PAGE_TYPE });
}

export async function updatePageTitle(client: Client, pageId: string, title: string): Promise<Page> {
  const { data, error } = await client.from("pages").update({ title }).eq("id", pageId).select("*").single();
  if (error) throw error;
  return data;
}

export async function archivePage(client: Client, pageId: string, isArchived: boolean): Promise<Page> {
  const { data, error } = await client
    .from("pages")
    .update({ is_archived: isArchived })
    .eq("id", pageId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deletePage(client: Client, pageId: string): Promise<void> {
  const { error } = await client.from("pages").delete().eq("id", pageId);
  if (error) throw error;
}

export async function listBlocks(client: Client, pageId: string): Promise<Block[]> {
  const { data, error } = await client
    .from("blocks")
    .select("*")
    .eq("page_id", pageId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createBlock(
  client: Client,
  pageId: string,
  blockType: BlockType,
  content: Record<string, unknown>,
  orderIndex: number,
): Promise<Block> {
  const { data, error } = await client
    .from("blocks")
    .insert({ page_id: pageId, block_type: blockType, content: content as unknown as Json, order_index: orderIndex })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listCheckpoints(client: Client, pageId: string): Promise<PageCheckpoint[]> {
  const { data, error } = await client
    .from("page_checkpoints")
    .select("*")
    .eq("page_id", pageId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Snapshot completo (título + todos os blocos) naquele momento — nunca automático, só sob pedido. */
export async function createCheckpoint(client: Client, pageId: string): Promise<PageCheckpoint> {
  const page = await getPage(client, pageId);
  const blocks = await listBlocks(client, pageId);
  const snapshot: BlockSnapshot[] = blocks.map((b) => ({
    blockType: b.block_type,
    content: b.content as Record<string, unknown>,
    orderIndex: b.order_index,
  }));

  const { data, error } = await client
    .from("page_checkpoints")
    .insert({ page_id: pageId, title: page.title, blocks_snapshot: snapshot as unknown as Json })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * "Git revert", não "git reset": arquiva o estado atual como um checkpoint automático antes de
 * qualquer coisa — o que estava na página antes de restaurar nunca desaparece do histórico.
 * Depois apaga os blocos atuais e recria a partir do snapshot escolhido.
 */
export async function restoreCheckpoint(client: Client, pageId: string, checkpoint: PageCheckpoint): Promise<Page> {
  await createCheckpoint(client, pageId);

  const { error: deleteError } = await client.from("blocks").delete().eq("page_id", pageId);
  if (deleteError) throw deleteError;

  const snapshot = checkpoint.blocks_snapshot as unknown as BlockSnapshot[];
  if (snapshot.length > 0) {
    const { error: insertError } = await client.from("blocks").insert(
      snapshot.map((block) => ({
        page_id: pageId,
        block_type: block.blockType,
        content: block.content as unknown as Json,
        order_index: block.orderIndex,
      })),
    );
    if (insertError) throw insertError;
  }

  return updatePageTitle(client, pageId, checkpoint.title);
}

export async function deleteBlock(client: Client, blockId: string): Promise<void> {
  const { error } = await client.from("blocks").delete().eq("id", blockId);
  if (error) throw error;
}

/**
 * Enter no meio da lista precisa inserir logo depois do bloco atual, não no fim — `order_index`
 * é inteiro sem espaço fracionário, então abre espaço empurrando os `order_index` dos blocos
 * seguintes em 1 antes de inserir (sequencial, aceitável pro número de blocos de uma página de
 * usuário único).
 */
export async function createBlockAfter(
  client: Client,
  pageId: string,
  afterBlockId: string,
  blockType: BlockType,
  content: Record<string, unknown>,
): Promise<Block> {
  const blocks = await listBlocks(client, pageId);
  const afterIndex = blocks.findIndex((b) => b.id === afterBlockId);
  const insertOrderIndex = afterIndex === -1 ? blocks.length : blocks[afterIndex]!.order_index + 1;

  const toShift = blocks.filter((b) => b.order_index >= insertOrderIndex);
  for (const block of toShift) {
    const { error } = await client.from("blocks").update({ order_index: block.order_index + 1 }).eq("id", block.id);
    if (error) throw error;
  }

  return createBlock(client, pageId, blockType, content, insertOrderIndex);
}

export async function updateBlockContent(client: Client, blockId: string, content: Record<string, unknown>): Promise<Block> {
  const { data, error } = await client
    .from("blocks")
    .update({ content: content as unknown as Json })
    .eq("id", blockId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Trocar de tipo (via "/" ou pelo dropdown) sempre reseta o conteúdo pra forma padrão do novo tipo — não faz sentido tentar reaproveitar `{text}` de um bloco "texto" como `{summary, details}` de um "toggle". */
export async function updateBlockType(
  client: Client,
  blockId: string,
  blockType: BlockType,
  content: Record<string, unknown>,
): Promise<Block> {
  const { data, error } = await client
    .from("blocks")
    .update({ block_type: blockType, content: content as unknown as Json })
    .eq("id", blockId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Botões subir/descer (v1, sem drag-and-drop): troca o `order_index` do bloco com o vizinho
 * imediato na direção pedida. Sem efeito nas pontas (primeiro bloco não sobe, último não desce).
 */
export async function moveBlock(client: Client, pageId: string, blockId: string, direction: "up" | "down"): Promise<void> {
  const blocks = await listBlocks(client, pageId);
  const index = blocks.findIndex((b) => b.id === blockId);
  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || neighborIndex < 0 || neighborIndex >= blocks.length) return;

  const current = blocks[index]!;
  const neighbor = blocks[neighborIndex]!;

  const { error: error1 } = await client.from("blocks").update({ order_index: neighbor.order_index }).eq("id", current.id);
  if (error1) throw error1;
  const { error: error2 } = await client.from("blocks").update({ order_index: current.order_index }).eq("id", neighbor.id);
  if (error2) throw error2;
}

export async function listPageProperties(client: Client, pageId: string): Promise<PageProperty[]> {
  const { data, error } = await client.from("page_properties").select("*").eq("page_id", pageId);
  if (error) throw error;
  return data;
}

export async function setPageProperty(
  client: Client,
  pageId: string,
  key: string,
  value: unknown,
): Promise<PageProperty> {
  const { data, error } = await client
    .from("page_properties")
    .upsert({ page_id: pageId, key, value: value as unknown as Json }, { onConflict: "page_id,key" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listPageTags(client: Client, pageId: string): Promise<string[]> {
  const { data, error } = await client.from("page_tags").select("tag").eq("page_id", pageId);
  if (error) throw error;
  return data.map((row) => row.tag);
}

export async function addPageTag(client: Client, pageId: string, tag: string): Promise<void> {
  const { error } = await client.from("page_tags").insert({ page_id: pageId, tag });
  if (error) throw error;
}

export async function removePageTag(client: Client, pageId: string, tag: string): Promise<void> {
  const { error } = await client.from("page_tags").delete().eq("page_id", pageId).eq("tag", tag);
  if (error) throw error;
}

export async function createPageLink(client: Client, sourcePageId: string, targetPageId: string): Promise<void> {
  const { error } = await client
    .from("page_links")
    .insert({ source_page_id: sourcePageId, target_page_id: targetPageId });
  if (error) throw error;
}

export async function listOutgoingLinks(client: Client, pageId: string): Promise<PageLink[]> {
  const { data, error } = await client.from("page_links").select("*").eq("source_page_id", pageId);
  if (error) throw error;
  return data;
}

/** Todos os links entre páginas do usuário — usado pelo Grafo de Conhecimento (visual). */
export async function listAllPageLinks(client: Client): Promise<PageLink[]> {
  const { data, error } = await client.from("page_links").select("*");
  if (error) throw error;
  return data;
}

/** Backlinks: páginas que referenciam esta página. */
export async function listBacklinks(client: Client, pageId: string): Promise<Page[]> {
  const { data: links, error: linksError } = await client
    .from("page_links")
    .select("source_page_id")
    .eq("target_page_id", pageId);
  if (linksError) throw linksError;
  if (links.length === 0) return [];

  const { data, error } = await client
    .from("pages")
    .select("*")
    .in(
      "id",
      links.map((l) => l.source_page_id),
    );
  if (error) throw error;
  return data;
}

export async function listBases(client: Client): Promise<Base[]> {
  const { data, error } = await client.from("bases").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createBase(client: Client, userId: string, name: string): Promise<Base> {
  const { data, error } = await client.from("bases").insert({ user_id: userId, name }).select("*").single();
  if (error) throw error;
  return data;
}

export async function listBasePages(client: Client, baseId: string): Promise<Page[]> {
  const { data: memberships, error: membershipsError } = await client
    .from("base_pages")
    .select("page_id")
    .eq("base_id", baseId);
  if (membershipsError) throw membershipsError;
  if (memberships.length === 0) return [];

  const { data, error } = await client
    .from("pages")
    .select("*")
    .in(
      "id",
      memberships.map((m) => m.page_id),
    );
  if (error) throw error;
  return data;
}

export async function addPageToBase(client: Client, baseId: string, pageId: string): Promise<void> {
  const { error } = await client.from("base_pages").insert({ base_id: baseId, page_id: pageId });
  if (error) throw error;
}

export async function listBaseFormulas(client: Client, baseId: string): Promise<BaseFormula[]> {
  const { data, error } = await client.from("base_formulas").select("*").eq("base_id", baseId);
  if (error) throw error;
  return data;
}

export async function createBaseFormula(
  client: Client,
  baseId: string,
  key: string,
  expression: string,
): Promise<BaseFormula> {
  const { data, error } = await client
    .from("base_formulas")
    .insert({ base_id: baseId, key, expression })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBaseFormula(client: Client, formulaId: string): Promise<void> {
  const { error } = await client.from("base_formulas").delete().eq("id", formulaId);
  if (error) throw error;
}

export async function deleteBase(client: Client, baseId: string): Promise<void> {
  const { error } = await client.from("bases").delete().eq("id", baseId);
  if (error) throw error;
}

export async function removePageFromBase(client: Client, baseId: string, pageId: string): Promise<void> {
  const { error } = await client.from("base_pages").delete().eq("base_id", baseId).eq("page_id", pageId);
  if (error) throw error;
}

/** "Views de Base persistidas" — persiste ordenação/filtro de uma Base (uma view por Base). */
export async function updateBaseViewConfig(client: Client, baseId: string, viewConfig: BaseViewConfig): Promise<Base> {
  const { data, error } = await client
    .from("bases")
    .update({ view_config: toBaseViewConfigJson(viewConfig) })
    .eq("id", baseId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listPropertiesForPages(client: Client, pageIds: string[]): Promise<PageProperty[]> {
  if (pageIds.length === 0) return [];
  const { data, error } = await client.from("page_properties").select("*").in("page_id", pageIds);
  if (error) throw error;
  return data;
}

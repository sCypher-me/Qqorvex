import type { SupabaseClient, Database } from "@qqorvex/database";
import { assertDocumentFitsStorageQuota, buildStoragePath, buildVersionStoragePath, computeFileHash, computeWarrantyEndDate, documentStorageLimitFromError, isTrashExpired } from "./service";
import type { Document, DocumentImportantDate, DocumentRelation, DocumentVersion, Folder, Warranty } from "./types";

type Client = SupabaseClient<Database>;

async function assertStorageQuota(client: Client, fileBytes: number): Promise<void> {
  const { data, error } = await client.rpc("get_my_document_storage_quota");
  // A migração ainda pode não estar publicada; nesse estágio, o Storage mantém o comportamento atual.
  // Após a publicação, a política RLS no próprio bucket continua sendo a validação autoritativa.
  if (error?.code === "PGRST202" || error?.code === "42883") return;
  if (error) throw new Error("Não foi possível conferir o espaço disponível. Tente novamente antes de enviar.");
  const row = data?.[0];
  if (!row) throw new Error("Não foi possível conferir o espaço disponível. Tente novamente antes de enviar.");
  assertDocumentFitsStorageQuota(fileBytes, {
    usedBytes: Number(row.used_bytes),
    quotaBytes: row.quota_bytes === null ? null : Number(row.quota_bytes),
    maxFileBytes: Number(row.max_file_bytes),
    isPlus: row.is_plus,
  });
}

function storageError(error: unknown): unknown {
  return documentStorageLimitFromError(error) ?? error;
}

export async function getDocumentStorageQuota(client: Client) {
  const { data, error } = await client.rpc("get_my_document_storage_quota");
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return {
    usedBytes: Number(row.used_bytes),
    quotaBytes: row.quota_bytes === null ? null : Number(row.quota_bytes),
    maxFileBytes: Number(row.max_file_bytes),
    isPlus: row.is_plus,
  };
}

const BUCKET = "documents";

export class DuplicateDocumentError extends Error {
  constructor(public readonly existing: Document) {
    super(`Este arquivo já foi enviado como "${existing.file_name}".`);
    this.name = "DuplicateDocumentError";
  }
}

export async function findDuplicateDocuments(client: Client, contentHash: string): Promise<Document[]> {
  const { data, error } = await client
    .from("documents")
    .select("*")
    .eq("content_hash", contentHash)
    .is("deleted_at", null);
  if (error) throw error;
  return data;
}

export async function listDocuments(client: Client, archived = false): Promise<Document[]> {
  const { data, error } = await client
    .from("documents")
    .select("*")
    .eq("is_archived", archived)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Faz upload do arquivo para o bucket privado `documents` e cria o registro de metadados numa
 * única operação lógica. O id do documento é gerado no cliente para poder compor o caminho de
 * Storage (`{user_id}/{document_id}/{file_name}`) antes de existir a linha — as RLS policies de
 * storage.objects exigem esse prefixo por usuário.
 */
export async function uploadDocument(
  client: Client,
  userId: string,
  file: File | Blob,
  fileName: string,
  documentType: Document["document_type"] = "outro",
  options?: { force?: boolean; folderId?: string },
): Promise<Document> {
  await assertStorageQuota(client, file.size);
  const contentHash = await computeFileHash(file);

  if (!options?.force) {
    const duplicates = await findDuplicateDocuments(client, contentHash);
    if (duplicates.length > 0) throw new DuplicateDocumentError(duplicates[0]!);
  }

  const documentId = crypto.randomUUID();
  const storagePath = buildStoragePath(userId, documentId, fileName);

  const { error: uploadError } = await client.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file instanceof File ? file.type : undefined,
  });
  if (uploadError) throw storageError(uploadError);

  const { data, error } = await client
    .from("documents")
    .insert({
      id: documentId,
      user_id: userId,
      file_name: fileName,
      storage_path: storagePath,
      mime_type: file instanceof File ? file.type : null,
      size_bytes: file.size,
      document_type: documentType,
      content_hash: contentHash,
      folder_id: options?.folderId ?? null,
    })
    .select("*")
    .single();
  if (error) {
    // The object was already stored; best-effort cleanup avoids orphaned private files if metadata fails.
    try {
      await client.storage.from(BUCKET).remove([storagePath]);
    } catch {
      // Preserve the original database error for the upload form.
    }
    throw error;
  }
  return data;
}

/**
 * Arquiva o estado atual do documento em `document_versions` (aponta pro objeto original, sem
 * recopiar) e move o storage para o novo caminho de arquivamento antes de escrever o novo
 * conteúdo por cima — assim nunca há uma janela em que o arquivo "atual" e o arquivado disputam
 * o mesmo caminho de Storage. `document_versions` não passa por checagem de duplicados: é uma
 * preocupação diferente da deduplicação entre documentos distintos já feita em `uploadDocument`.
 */
export async function uploadNewVersion(client: Client, document: Document, file: File | Blob, fileName: string): Promise<Document> {
  await assertStorageQuota(client, file.size);
  const archivePath = buildVersionStoragePath(document.user_id, document.id, document.current_version, document.file_name);
  const { error: copyError } = await client.storage.from(BUCKET).copy(document.storage_path, archivePath);
  if (copyError) throw storageError(copyError);
  const { error: removeError } = await client.storage.from(BUCKET).remove([document.storage_path]);
  if (removeError) throw removeError;

  const { error: versionError } = await client.from("document_versions").insert({
    document_id: document.id,
    version_number: document.current_version,
    storage_path: archivePath,
    file_name: document.file_name,
    mime_type: document.mime_type,
    size_bytes: document.size_bytes,
    content_hash: document.content_hash,
  });
  if (versionError) throw versionError;

  const contentHash = await computeFileHash(file);
  const newStoragePath = buildStoragePath(document.user_id, document.id, fileName);
  const { error: uploadError } = await client.storage.from(BUCKET).upload(newStoragePath, file, {
    contentType: file instanceof File ? file.type : undefined,
    upsert: true,
  });
  if (uploadError) throw storageError(uploadError);

  const { data, error } = await client
    .from("documents")
    .update({
      file_name: fileName,
      storage_path: newStoragePath,
      mime_type: file instanceof File ? file.type : null,
      size_bytes: file.size,
      content_hash: contentHash,
      current_version: document.current_version + 1,
    })
    .eq("id", document.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listDocumentVersions(client: Client, documentId: string): Promise<DocumentVersion[]> {
  const { data, error } = await client
    .from("document_versions")
    .select("*")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Restaurar é simétrico ao upload de nova versão: o estado atual é arquivado antes de trazer o
 * conteúdo da versão escolhida de volta ao caminho "atual". Isso não apaga a versão restaurada
 * do histórico nem cria um "retrocesso" de número — `current_version` sempre avança, como um
 * `git revert` em vez de um `git reset`.
 */
export async function restoreDocumentVersion(client: Client, document: Document, version: DocumentVersion): Promise<Document> {
  await assertStorageQuota(client, version.size_bytes ?? 0);
  const archivePath = buildVersionStoragePath(document.user_id, document.id, document.current_version, document.file_name);
  const { error: copyError } = await client.storage.from(BUCKET).copy(document.storage_path, archivePath);
  if (copyError) throw storageError(copyError);
  const { error: removeError } = await client.storage.from(BUCKET).remove([document.storage_path]);
  if (removeError) throw removeError;

  const { error: versionError } = await client.from("document_versions").insert({
    document_id: document.id,
    version_number: document.current_version,
    storage_path: archivePath,
    file_name: document.file_name,
    mime_type: document.mime_type,
    size_bytes: document.size_bytes,
    content_hash: document.content_hash,
  });
  if (versionError) throw versionError;

  const restoredPath = buildStoragePath(document.user_id, document.id, version.file_name);
  const { error: restoreCopyError } = await client.storage.from(BUCKET).copy(version.storage_path, restoredPath);
  if (restoreCopyError) throw storageError(restoreCopyError);

  const { data, error } = await client
    .from("documents")
    .update({
      file_name: version.file_name,
      storage_path: restoredPath,
      mime_type: version.mime_type,
      size_bytes: version.size_bytes,
      content_hash: version.content_hash,
      current_version: document.current_version + 1,
    })
    .eq("id", document.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getDownloadUrl(client: Client, storagePath: string): Promise<string> {
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

/** "Excluir" move para a lixeira — o arquivo físico só é removido em `purgeDocument`. */
export async function deleteDocument(client: Client, documentId: string): Promise<Document> {
  const { data, error } = await client
    .from("documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", documentId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function restoreDocument(client: Client, documentId: string): Promise<Document> {
  const { data, error } = await client
    .from("documents")
    .update({ deleted_at: null })
    .eq("id", documentId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Exclusão física de verdade: remove o objeto do Storage e a linha. Sem volta. */
export async function purgeDocument(client: Client, document: Document): Promise<void> {
  const { data: versions, error: versionsError } = await client
    .from("document_versions")
    .select("storage_path")
    .eq("document_id", document.id);
  if (versionsError) throw versionsError;
  const storagePaths = [...new Set([document.storage_path, ...versions.map((version) => version.storage_path)])];
  const { error: storageError } = await client.storage.from(BUCKET).remove(storagePaths);
  if (storageError) throw storageError;
  const { error } = await client.from("documents").delete().eq("id", document.id);
  if (error) throw error;
}

/**
 * Lista a lixeira e faz a "varredura preguiçosa" da retenção: documentos que já passaram do
 * prazo são purgados de verdade nesta leitura (sem precisar de scheduler/cron próprio ainda
 * inexistente), e só os que ainda estão dentro do prazo voltam pra UI.
 */
export async function listTrashedDocuments(client: Client): Promise<Document[]> {
  const { data, error } = await client
    .from("documents")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw error;

  const today = new Date();
  const active: Document[] = [];
  for (const document of data) {
    if (isTrashExpired(document.deleted_at!, today)) {
      await purgeDocument(client, document);
    } else {
      active.push(document);
    }
  }
  return active;
}

/** Muda só o nome exibido — o arquivo no Storage continua no mesmo caminho. */
export async function renameDocument(client: Client, documentId: string, fileName: string): Promise<Document> {
  const { data, error } = await client.from("documents").update({ file_name: fileName }).eq("id", documentId).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateDocumentType(client: Client, documentId: string, documentType: Document["document_type"]): Promise<Document> {
  const { data, error } = await client
    .from("documents")
    .update({ document_type: documentType })
    .eq("id", documentId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateExtractedText(client: Client, documentId: string, extractedText: string): Promise<Document> {
  const { data, error } = await client
    .from("documents")
    .update({ extracted_text: extractedText })
    .eq("id", documentId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function toggleImportant(client: Client, documentId: string, isImportant: boolean): Promise<Document> {
  const { data, error } = await client
    .from("documents")
    .update({ is_important: isImportant })
    .eq("id", documentId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Põe ou tira um documento do Cofre. A barreira mora no servidor (migration vault_server_lock):
 * com o Cofre bloqueado a RLS esconde, e impede editar/baixar, tudo que é do Cofre.
 * - Pôr no Cofre usa `move_document_to_vault`: um UPDATE comum falharia com o Cofre bloqueado,
 *   porque a linha atualizada deixaria de ser visível a quem atualizou.
 * - Tirar do Cofre é um UPDATE comum — só passa com o Cofre desbloqueado nesta sessão.
 */
export async function toggleVault(client: Client, documentId: string, isVault: boolean): Promise<void> {
  if (isVault) {
    const { data: moved, error } = await client.rpc("move_document_to_vault", { document_id: documentId });
    if (error) throw error;
    if (!moved) throw new Error("Não foi possível pôr este documento no Cofre.");
    return;
  }
  const { error } = await client.from("documents").update({ is_vault: false }).eq("id", documentId).select("id").single();
  if (error) throw error;
}

/**
 * Desbloqueia o Cofre nesta sessão de login por 15 minutos (PIN conferido no servidor, com o
 * mesmo bloqueio de 5 erros → 5 minutos). Devolve até quando vale, ou `null` se o PIN estiver
 * errado ou bloqueado.
 */
export async function unlockVault(client: Client, pin: string): Promise<string | null> {
  const { data, error } = await client.rpc("unlock_vault", { pin });
  if (error) throw error;
  return data ?? null;
}

/** "Bloquear agora": encerra o desbloqueio desta sessão. */
export async function lockVault(client: Client): Promise<void> {
  const { error } = await client.rpc("lock_vault");
  if (error) throw error;
}

/** Até quando o Cofre está aberto nesta sessão (`null` = bloqueado). */
export async function getVaultUnlockedUntil(client: Client): Promise<string | null> {
  const { data, error } = await client.rpc("vault_unlocked_until");
  if (error) throw error;
  return data ?? null;
}

/** Quantos documentos há no Cofre — a lista em si fica escondida enquanto ele está bloqueado. */
export async function countVaultDocuments(client: Client): Promise<number> {
  const { data, error } = await client.rpc("count_my_vault_documents");
  if (error) throw error;
  return data ?? 0;
}

export async function listFolders(client: Client): Promise<Folder[]> {
  const { data, error } = await client.from("folders").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createFolder(client: Client, userId: string, name: string): Promise<Folder> {
  const { data, error } = await client.from("folders").insert({ user_id: userId, name }).select("*").single();
  if (error) throw error;
  return data;
}

export async function renameFolder(client: Client, folderId: string, name: string): Promise<Folder> {
  const { data, error } = await client.from("folders").update({ name }).eq("id", folderId).select("*").single();
  if (error) throw error;
  return data;
}

export async function moveDocumentToFolder(client: Client, documentId: string, folderId: string | null): Promise<Document> {
  const { data, error } = await client
    .from("documents")
    .update({ folder_id: folderId })
    .eq("id", documentId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function setDocumentArchived(client: Client, documentId: string, isArchived: boolean): Promise<Document> {
  const { data, error } = await client
    .from("documents")
    .update({ is_archived: isArchived })
    .eq("id", documentId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFolder(client: Client, folderId: string): Promise<void> {
  const { error } = await client.from("folders").delete().eq("id", folderId);
  if (error) throw error;
}

export async function addDocumentRelation(
  client: Client,
  documentId: string,
  relatedModule: string,
  relatedEntityId: string,
): Promise<DocumentRelation> {
  const { data, error } = await client
    .from("document_relations")
    .insert({ document_id: documentId, related_module: relatedModule, related_entity_id: relatedEntityId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listDocumentRelations(client: Client, documentId: string): Promise<DocumentRelation[]> {
  const { data, error } = await client.from("document_relations").select("*").eq("document_id", documentId);
  if (error) throw error;
  return data;
}

export async function removeDocumentRelation(client: Client, relationId: string): Promise<void> {
  const { error } = await client.from("document_relations").delete().eq("id", relationId);
  if (error) throw error;
}

export async function removeDocumentRelationByEntity(
  client: Client,
  documentId: string,
  relatedModule: string,
  relatedEntityId: string,
): Promise<void> {
  const { error } = await client
    .from("document_relations")
    .delete()
    .eq("document_id", documentId)
    .eq("related_module", relatedModule)
    .eq("related_entity_id", relatedEntityId);
  if (error) throw error;
}

/**
 * Busca reversa: "quais documentos estão relacionados a esta entidade de outro módulo"
 * (ex.: comprovantes de uma movimentação de Finanças, apostilas de um Caderno de Estudos).
 * "Remover uma relação não deve apagar automaticamente o arquivo" — isto só lê a relação.
 */
export async function listRelatedDocuments(
  client: Client,
  relatedModule: string,
  relatedEntityId: string,
): Promise<Document[]> {
  const { data: relations, error: relationsError } = await client
    .from("document_relations")
    .select("document_id")
    .eq("related_module", relatedModule)
    .eq("related_entity_id", relatedEntityId);
  if (relationsError) throw relationsError;
  if (relations.length === 0) return [];

  const { data, error } = await client
    .from("documents")
    .select("*")
    .in("id", relations.map((r) => r.document_id));
  if (error) throw error;
  return data;
}

export async function addImportantDate(
  client: Client,
  documentId: string,
  label: string,
  date: string,
): Promise<DocumentImportantDate> {
  const { data, error } = await client
    .from("document_important_dates")
    .insert({ document_id: documentId, label, date })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listUpcomingImportantDates(
  client: Client,
  fromDate: string,
  toDate: string,
): Promise<DocumentImportantDate[]> {
  const { data, error } = await client
    .from("document_important_dates")
    .select("*")
    .gte("date", fromDate)
    .lte("date", toDate);
  if (error) throw error;
  return data;
}

export async function createWarranty(
  client: Client,
  userId: string,
  input: { productName: string; purchaseDate: string; durationMonths: number; documentId?: string },
): Promise<Warranty> {
  const { data, error } = await client
    .from("warranties")
    .insert({
      user_id: userId,
      product_name: input.productName,
      purchase_date: input.purchaseDate,
      duration_months: input.durationMonths,
      end_date: computeWarrantyEndDate(input.purchaseDate, input.durationMonths),
      document_id: input.documentId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listWarranties(client: Client): Promise<Warranty[]> {
  const { data, error } = await client.from("warranties").select("*").order("end_date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listUpcomingWarranties(client: Client, fromDate: string, toDate: string): Promise<Warranty[]> {
  const { data, error } = await client
    .from("warranties")
    .select("*")
    .gte("end_date", fromDate)
    .lte("end_date", toDate);
  if (error) throw error;
  return data;
}

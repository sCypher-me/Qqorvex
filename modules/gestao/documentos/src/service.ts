import type { Document, DocumentType } from "./types";

/** Rótulos em pt-BR do enum `document_type` — única fonte pra UploadForm, filtro e DocumentCard não divergirem. */
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  nota_fiscal: "Nota fiscal",
  recibo: "Recibo",
  contrato: "Contrato",
  garantia: "Garantia",
  comprovante: "Comprovante",
  certificado: "Certificado",
  documento_pessoal: "Documento pessoal",
  fatura: "Fatura",
  manual: "Manual",
  outro: "Outro",
};

export type DocumentQuickFilter = "all" | "important" | "vault" | "recent";
export type DocumentSortOrder = "newest" | "oldest" | "name" | "largest";
export type DocumentStorageQuota = {
  usedBytes: number;
  /** `null` = sem cota por conta (acesso Ilimitado); o tamanho por arquivo continua valendo. */
  quotaBytes: number | null;
  maxFileBytes: number;
  isPlus: boolean;
};

export class DocumentStorageLimitError extends Error {
  constructor(public readonly limitKind: "file" | "storage", public readonly limitBytes: number) {
    const limitMb = Math.round(limitBytes / (1024 * 1024));
    super(limitKind === "file"
      ? `Este plano permite arquivos de até ${limitMb} MB.`
      : `O armazenamento do plano está cheio (${limitMb} MB). Remova arquivos ou conheça o Qqorvex Plus.`);
    this.name = "DocumentStorageLimitError";
  }
}

export function assertDocumentFitsStorageQuota(fileBytes: number, quota: DocumentStorageQuota): void {
  if (fileBytes > quota.maxFileBytes) throw new DocumentStorageLimitError("file", quota.maxFileBytes);
  if (quota.quotaBytes !== null && quota.usedBytes + fileBytes > quota.quotaBytes) throw new DocumentStorageLimitError("storage", quota.quotaBytes);
}

export function documentStorageLimitFromError(error: unknown): DocumentStorageLimitError | null {
  if (!error || typeof error !== "object" || !("message" in error) || typeof error.message !== "string") return null;
  const match = /^QQORVEX_DOCUMENT_(FILE|STORAGE)_LIMIT:(\d+)$/.exec(error.message);
  if (!match) return null;
  return new DocumentStorageLimitError(match[1] === "FILE" ? "file" : "storage", Number(match[2]));
}

export type DocumentListItem = Pick<
  Document,
  | "id"
  | "file_name"
  | "mime_type"
  | "document_type"
  | "folder_id"
  | "is_important"
  | "is_vault"
  | "created_at"
  | "size_bytes"
  | "extracted_text"
>;

/** Busca local por nome, tipo e texto OCR, aplicando filtros rápidos sem round-trip ao servidor. */
export function selectDocuments<T extends DocumentListItem>(
  documents: T[],
  options: {
    query?: string;
    folderId?: string | null;
    type?: DocumentType | "";
    quickFilter?: DocumentQuickFilter;
    sort?: DocumentSortOrder;
    now?: Date;
  } = {},
): T[] {
  const query = options.query?.trim().toLocaleLowerCase("pt-BR") ?? "";
  const now = options.now?.getTime() ?? Date.now();
  const recentWindow = 7 * 24 * 60 * 60 * 1000;

  const filtered = documents.filter((document) => {
    if (options.folderId && document.folder_id !== options.folderId) return false;
    if (options.type && document.document_type !== options.type) return false;
    if (options.quickFilter === "important" && !document.is_important) return false;
    if (options.quickFilter === "vault" && !document.is_vault) return false;
    if (options.quickFilter === "recent") {
      const age = now - new Date(document.created_at).getTime();
      if (age < 0 || age >= recentWindow) return false;
    }
    if (query) {
      const searchableText = [
        document.file_name,
        document.mime_type,
        DOCUMENT_TYPE_LABELS[document.document_type],
        document.extracted_text,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      if (!searchableText.includes(query)) return false;
    }
    return true;
  });

  return filtered.sort((left, right) => {
    switch (options.sort ?? "newest") {
      case "oldest":
        return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
      case "name":
        return left.file_name.localeCompare(right.file_name, "pt-BR", { sensitivity: "base" });
      case "largest":
        return (right.size_bytes ?? -1) - (left.size_bytes ?? -1);
      case "newest":
      default:
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    }
  });
}

/**
 * "O sistema pode calcular a data final a partir da data da compra + duração informada."
 * Ex.: compra em 2026-09-08 + 24 meses → 2028-09-08. Cálculo puro, sem SQL.
 */
export function computeWarrantyEndDate(purchaseDate: string, durationMonths: number): string {
  const date = new Date(`${purchaseDate}T00:00:00`);
  date.setMonth(date.getMonth() + durationMonths);
  return date.toISOString().slice(0, 10);
}

/** Caminho por usuário dentro do bucket privado, exigido pelas RLS policies de storage.objects. */
export function buildStoragePath(userId: string, documentId: string, fileName: string): string {
  return `${userId}/${documentId}/${fileName}`;
}

/** Extensão "de verdade": 1 a 5 caracteres com pelo menos uma letra (".pdf" sim, ".2" de "v1.2" não). */
const FILE_EXTENSION = /\.(?=[a-z0-9]{0,4}[a-z])[a-z0-9]{1,5}$/i;

/**
 * Nome novo ao renomear um documento. Sem extensão, herda a do nome atual (quem digita "Contrato
 * do aluguel" não quer perder o ".pdf"). Barras viram "-" porque o nome entra no caminho das
 * versões no Storage (`buildVersionStoragePath`). Vazio → `null` (não renomeia).
 */
export function normalizeDocumentRename(input: string, currentName: string): string | null {
  const name = input.replace(/[/\\]/g, "-").replace(/\s+/g, " ").trim();
  if (!name) return null;
  const currentExtension = currentName.match(FILE_EXTENSION)?.[0];
  if (!currentExtension || FILE_EXTENSION.test(name)) return name;
  return `${name}${currentExtension}`;
}

/** Caminho de arquivamento de uma versão antiga, isolado do caminho "atual" para nunca colidir com ele. */
export function buildVersionStoragePath(userId: string, documentId: string, versionNumber: number, fileName: string): string {
  return `${userId}/${documentId}/versions/${versionNumber}/${fileName}`;
}

/** "Lixeira própria com retenção" — dias que um documento excluído fica recuperável antes da exclusão física. */
export const TRASH_RETENTION_DAYS = 30;

export function computeTrashExpiryDate(deletedAt: string, retentionDays: number = TRASH_RETENTION_DAYS): Date {
  const date = new Date(deletedAt);
  date.setDate(date.getDate() + retentionDays);
  return date;
}

export function isTrashExpired(deletedAt: string, referenceDate: Date, retentionDays: number = TRASH_RETENTION_DAYS): boolean {
  return computeTrashExpiryDate(deletedAt, retentionDays) <= referenceDate;
}

export function daysUntilTrashExpiry(deletedAt: string, referenceDate: Date, retentionDays: number = TRASH_RETENTION_DAYS): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((computeTrashExpiryDate(deletedAt, retentionDays).getTime() - referenceDate.getTime()) / msPerDay));
}

/** OCR (Tesseract.js) só faz sentido pra imagem — PDF/outros formatos ficam fora da v1. */
export function isImageMimeType(mimeType: string | null): boolean {
  return mimeType?.startsWith("image/") ?? false;
}

/** "Detecção de duplicados por hash" — SHA-256 do conteúdo, calculado no cliente via Web Crypto. */
export async function computeFileHash(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

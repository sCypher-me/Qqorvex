import type { DocumentType } from "./types";

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

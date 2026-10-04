import type { Tables } from "@qqorvex/database";

/**
 * Documentos & Arquivos é a fonte de verdade do arquivo e de seus metadados; outros módulos
 * guardam apenas referência/relação via `document_relations`. OCR de imagem implementado via
 * Tesseract.js (`extracted_text`, `ocr.ts`).
 * Cofre (`is_vault`) é protegido no servidor: sem desbloqueio com o PIN nesta sessão de login
 * (válido por 15 minutos), a RLS esconde os documentos do Cofre e bloqueia os arquivos deles —
 * ver supabase/migrations/*_vault_server_lock.sql e `unlockVault`/`lockVault` no repository.
 */
export type Document = Tables<"documents">;
export type DocumentType = Document["document_type"];
export type Folder = Tables<"folders">;
export type DocumentRelation = Tables<"document_relations">;
export type DocumentImportantDate = Tables<"document_important_dates">;
export type Warranty = Tables<"warranties">;
export type DocumentVersion = Tables<"document_versions">;

export interface NewDocumentInput {
  fileName: string;
  storagePath: string;
  mimeType?: string;
  sizeBytes?: number;
  documentType?: DocumentType;
  folderId?: string;
}

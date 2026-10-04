import { describe, expect, it } from "vitest";
import {
  buildStoragePath,
  buildVersionStoragePath,
  assertDocumentFitsStorageQuota,
  computeTrashExpiryDate,
  computeWarrantyEndDate,
  DocumentStorageLimitError,
  daysUntilTrashExpiry,
  isImageMimeType,
  isTrashExpired,
  selectDocuments,
  TRASH_RETENTION_DAYS,
} from "./service";
import type { DocumentListItem } from "./service";

describe("computeWarrantyEndDate", () => {
  it("soma a duração em meses à data de compra", () => {
    expect(computeWarrantyEndDate("2026-09-08", 24)).toBe("2028-09-08");
  });
});

describe("buildStoragePath / buildVersionStoragePath", () => {
  it("isola por usuário/documento, e versões num subcaminho separado do atual", () => {
    expect(buildStoragePath("u1", "d1", "nota.pdf")).toBe("u1/d1/nota.pdf");
    expect(buildVersionStoragePath("u1", "d1", 2, "nota.pdf")).toBe("u1/d1/versions/2/nota.pdf");
  });
});

describe("cota de armazenamento de documentos", () => {
  const freeQuota = {
    usedBytes: 20 * 1024 * 1024,
    quotaBytes: 25 * 1024 * 1024,
    maxFileBytes: 10 * 1024 * 1024,
    isPlus: false,
  };

  it("aceita arquivo que cabe na cota individual e total", () => {
    expect(() => assertDocumentFitsStorageQuota(5 * 1024 * 1024, freeQuota)).not.toThrow();
  });

  it("recusa arquivo acima do máximo por arquivo", () => {
    expect(() => assertDocumentFitsStorageQuota(11 * 1024 * 1024, freeQuota))
      .toThrowError(new DocumentStorageLimitError("file", 10 * 1024 * 1024));
  });

  it("recusa arquivo que ultrapassaria o espaço total da conta", () => {
    expect(() => assertDocumentFitsStorageQuota(6 * 1024 * 1024, freeQuota))
      .toThrowError(new DocumentStorageLimitError("storage", 25 * 1024 * 1024));
  });

  it("acesso Ilimitado (cota nula) não tem teto por conta, só o tamanho por arquivo", () => {
    const unlimited = { usedBytes: 5 * 1024 * 1024 * 1024, quotaBytes: null, maxFileBytes: 50 * 1024 * 1024, isPlus: true };
    expect(() => assertDocumentFitsStorageQuota(40 * 1024 * 1024, unlimited)).not.toThrow();
    expect(() => assertDocumentFitsStorageQuota(60 * 1024 * 1024, unlimited)).toThrowError(new DocumentStorageLimitError("file", 50 * 1024 * 1024));
  });
});

describe("Lixeira — expiração por retenção", () => {
  it("expira exatamente em TRASH_RETENTION_DAYS dias após a exclusão", () => {
    const deletedAt = "2026-09-01T00:00:00Z";
    const expiry = computeTrashExpiryDate(deletedAt);
    expect(expiry.toISOString().slice(0, 10)).toBe("2026-10-01");
    expect(TRASH_RETENTION_DAYS).toBe(30);
  });

  it("isTrashExpired é false antes do prazo e true depois", () => {
    const deletedAt = "2026-09-01T00:00:00Z";
    expect(isTrashExpired(deletedAt, new Date("2026-09-15"))).toBe(false);
    expect(isTrashExpired(deletedAt, new Date("2026-10-02"))).toBe(true);
  });

  it("daysUntilTrashExpiry nunca fica negativo depois de expirado", () => {
    const deletedAt = "2026-09-01T00:00:00Z";
    expect(daysUntilTrashExpiry(deletedAt, new Date("2026-10-15"))).toBe(0);
  });
});

describe("isImageMimeType", () => {
  it("só considera tipos image/*", () => {
    expect(isImageMimeType("image/png")).toBe(true);
    expect(isImageMimeType("application/pdf")).toBe(false);
    expect(isImageMimeType(null)).toBe(false);
  });
});

describe("selectDocuments", () => {
  const now = new Date("2026-09-27T12:00:00Z");
  const items: DocumentListItem[] = [
    {
      id: "receipt", file_name: "recibo.pdf", mime_type: "application/pdf", document_type: "recibo", folder_id: "personal",
      is_important: true, is_vault: false, created_at: "2026-09-25T12:00:00Z", size_bytes: 1200, extracted_text: "Compra de material escolar",
    },
    {
      id: "passport", file_name: "scan-02.png", mime_type: "image/png", document_type: "documento_pessoal", folder_id: null,
      is_important: false, is_vault: true, created_at: "2026-09-21T12:00:00Z", size_bytes: 8500, extracted_text: "Passaporte válido até 2030",
    },
    {
      id: "manual", file_name: "Manual.pdf", mime_type: "application/pdf", document_type: "manual", folder_id: null,
      is_important: false, is_vault: false, created_at: "2026-08-10T12:00:00Z", size_bytes: 4000, extracted_text: null,
    },
  ];

  it("encontra texto extraído por OCR e respeita a busca sem diferenciar caixa", () => {
    expect(selectDocuments(items, { query: "PASSAPORTE", now }).map((item) => item.id)).toEqual(["passport"]);
  });

  it("aplica pastas, tipo e filtros rápidos sem incluir itens futuros em recentes", () => {
    expect(selectDocuments(items, { folderId: "personal", type: "recibo", quickFilter: "important", now }).map((item) => item.id)).toEqual(["receipt"]);
    expect(selectDocuments([...items, { ...items[0]!, id: "future", created_at: "2026-09-28T12:00:00Z" }], { quickFilter: "recent", now }).map((item) => item.id)).toEqual(["receipt", "passport"]);
  });

  it("ordena por nome e tamanho", () => {
    expect(selectDocuments(items, { sort: "name", now }).map((item) => item.id)).toEqual(["manual", "receipt", "passport"]);
    expect(selectDocuments(items, { sort: "largest", now }).map((item) => item.id)).toEqual(["passport", "manual", "receipt"]);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildStoragePath,
  buildVersionStoragePath,
  computeTrashExpiryDate,
  computeWarrantyEndDate,
  daysUntilTrashExpiry,
  isImageMimeType,
  isTrashExpired,
  TRASH_RETENTION_DAYS,
} from "./service";

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

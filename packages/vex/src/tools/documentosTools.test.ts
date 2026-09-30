import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";

vi.mock("@qqorvex/module-documentos", () => ({
  getVaultUnlockedUntil: vi.fn(),
  listDocuments: vi.fn(),
  lockVault: vi.fn(async () => undefined),
  toggleImportant: vi.fn(async (_client: unknown, id: string, isImportant: boolean) => ({ id, file_name: "passaporte.pdf", is_important: isImportant })),
  unlockVault: vi.fn(),
  uploadDocument: vi.fn(),
}));

import { getVaultUnlockedUntil, listDocuments, lockVault, toggleImportant, unlockVault } from "@qqorvex/module-documentos";
import { createDocumentosTools } from "./documentosTools";

const client = {} as SupabaseClient<Database>;
const toggle = createDocumentosTools(client, "u1").find((tool) => tool.name === "toggle_important_by_name")!;
const passaporte = { id: "d1", file_name: "passaporte.pdf", is_vault: true };

describe("toggle_important_by_name e o Cofre", () => {
  beforeEach(() => vi.clearAllMocks());

  it("com PIN e Cofre fechado: abre só para a ação e fecha de novo", async () => {
    vi.mocked(getVaultUnlockedUntil).mockResolvedValue(null);
    vi.mocked(unlockVault).mockResolvedValue("2026-09-30T15:00:00Z");
    vi.mocked(listDocuments).mockResolvedValue([passaporte] as never);
    const result = await toggle.execute({ name: "passaporte", isImportant: true, pin: "482916" });
    expect(result.summary).toMatch(/marcado como importante/);
    expect(unlockVault).toHaveBeenCalledWith(client, "482916");
    expect(lockVault).toHaveBeenCalledTimes(1);
  });

  it("com PIN e Cofre já aberto pela pessoa: não fecha", async () => {
    vi.mocked(getVaultUnlockedUntil).mockResolvedValue("2026-09-30T14:50:00Z");
    vi.mocked(unlockVault).mockResolvedValue("2026-09-30T15:00:00Z");
    vi.mocked(listDocuments).mockResolvedValue([passaporte] as never);
    await toggle.execute({ name: "passaporte", isImportant: false, pin: "482916" });
    expect(lockVault).not.toHaveBeenCalled();
  });

  it("PIN errado: não lista nem altera nada", async () => {
    vi.mocked(getVaultUnlockedUntil).mockResolvedValue(null);
    vi.mocked(unlockVault).mockResolvedValue(null);
    const result = await toggle.execute({ name: "passaporte", isImportant: true, pin: "000000" });
    expect(result.summary).toMatch(/PIN do Cofre incorreto/);
    expect(listDocuments).not.toHaveBeenCalled();
    expect(toggleImportant).not.toHaveBeenCalled();
  });

  it("sem PIN e documento escondido pelo Cofre: pede o PIN", async () => {
    vi.mocked(listDocuments).mockResolvedValue([] as never);
    const result = await toggle.execute({ name: "passaporte", isImportant: true });
    expect(result.summary).toMatch(/preciso do PIN do Cofre/);
    expect(unlockVault).not.toHaveBeenCalled();
    expect(lockVault).not.toHaveBeenCalled();
  });

  it("fecha o Cofre mesmo se a alteração falhar", async () => {
    vi.mocked(getVaultUnlockedUntil).mockResolvedValue(null);
    vi.mocked(unlockVault).mockResolvedValue("2026-09-30T15:00:00Z");
    vi.mocked(listDocuments).mockResolvedValue([passaporte] as never);
    vi.mocked(toggleImportant).mockRejectedValueOnce(new Error("falhou"));
    await expect(toggle.execute({ name: "passaporte", isImportant: true, pin: "482916" })).rejects.toThrow("falhou");
    expect(lockVault).toHaveBeenCalledTimes(1);
  });
});

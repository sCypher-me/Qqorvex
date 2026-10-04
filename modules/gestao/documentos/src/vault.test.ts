import { describe, expect, it } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";
import { countVaultDocuments, getVaultUnlockedUntil, lockVault, toggleVault, unlockVault } from "./repository";

/** Cliente falso: respostas de RPC por nome e registro das chamadas (RPC e tabelas). */
function fakeClient(rpcResults: Record<string, { data: unknown; error: unknown }> = {}) {
  const calls: unknown[][] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["update", "eq", "select", "single"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => void) => resolve({ data: { id: "doc-1", is_vault: false }, error: null });
  const client = {
    rpc: async (name: string, args?: unknown) => {
      calls.push(["rpc", name, args]);
      return rpcResults[name] ?? { data: null, error: null };
    },
    from: (table: string) => {
      calls.push(["from", table]);
      return builder;
    },
  } as unknown as SupabaseClient<Database>;
  return { client, calls };
}

describe("desbloqueio do Cofre", () => {
  it("unlockVault devolve até quando vale, ou null com PIN errado", async () => {
    const certo = fakeClient({ unlock_vault: { data: "2026-09-30T15:00:00Z", error: null } });
    expect(await unlockVault(certo.client, "482916")).toBe("2026-09-30T15:00:00Z");
    expect(certo.calls).toContainEqual(["rpc", "unlock_vault", { pin: "482916" }]);

    const errado = fakeClient({ unlock_vault: { data: null, error: null } });
    expect(await unlockVault(errado.client, "000000")).toBeNull();
  });

  it("repassa erro do servidor em vez de tratar como PIN errado", async () => {
    const { client } = fakeClient({ unlock_vault: { data: null, error: { message: "Sessão inválida" } } });
    await expect(unlockVault(client, "482916")).rejects.toMatchObject({ message: "Sessão inválida" });
  });

  it("lockVault, getVaultUnlockedUntil e countVaultDocuments chamam as funções do servidor", async () => {
    const { client, calls } = fakeClient({
      vault_unlocked_until: { data: null, error: null },
      count_my_vault_documents: { data: 3, error: null },
    });
    await lockVault(client);
    expect(await getVaultUnlockedUntil(client)).toBeNull();
    expect(await countVaultDocuments(client)).toBe(3);
    expect(calls.filter((call) => call[0] === "rpc").map((call) => call[1])).toEqual(["lock_vault", "vault_unlocked_until", "count_my_vault_documents"]);
  });
});

describe("toggleVault", () => {
  it("pôr no Cofre usa a função do servidor (funciona com o Cofre bloqueado)", async () => {
    const { client, calls } = fakeClient({ move_document_to_vault: { data: true, error: null } });
    await toggleVault(client, "doc-1", true);
    expect(calls).toContainEqual(["rpc", "move_document_to_vault", { document_id: "doc-1" }]);
    expect(calls.some((call) => call[0] === "update")).toBe(false);
  });

  it("avisa quando o servidor não moveu (documento de outra pessoa ou inexistente)", async () => {
    const { client } = fakeClient({ move_document_to_vault: { data: false, error: null } });
    await expect(toggleVault(client, "doc-1", true)).rejects.toThrow(/não foi possível/i);
  });

  it("tirar do Cofre é um update comum (a RLS exige o Cofre desbloqueado)", async () => {
    const { client, calls } = fakeClient();
    await toggleVault(client, "doc-1", false);
    expect(calls).toContainEqual(["update", { is_vault: false }]);
    expect(calls).toContainEqual(["eq", "id", "doc-1"]);
  });
});

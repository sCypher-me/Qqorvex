import { describe, expect, it, vi } from "vitest";
import type { Database, SupabaseClient } from "@qqorvex/database";
import { generateRecoveryCodes, recoveryCodesFile, redeemRecoveryCode, verifyCurrentPassword } from "./accountSecurity";

function fakeClient(rpcResult: { data: unknown; error: { message: string } | null }) {
  const refreshSession = vi.fn().mockResolvedValue({ data: {}, error: null });
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  return { client: { rpc, auth: { refreshSession } } as unknown as SupabaseClient<Database>, rpc, refreshSession };
}

describe("códigos de recuperação", () => {
  it("entrega os códigos gerados pelo servidor", async () => {
    const { client } = fakeClient({ data: ["abcde-fghjk", "mnpqr-stuvw"], error: null });
    expect(await generateRecoveryCodes(client)).toEqual({ codes: ["abcde-fghjk", "mnpqr-stuvw"], error: null });
  });

  it("explica quando falta passar pelo autenticador", async () => {
    const { client } = fakeClient({ data: null, error: { message: "mfa_required" } });
    expect((await generateRecoveryCodes(client)).error).toMatch(/app autenticador/);
  });

  it("código válido renova a sessão; inválido não", async () => {
    const valid = fakeClient({ data: true, error: null });
    expect(await redeemRecoveryCode(valid.client, "abcde-fghjk")).toEqual({ ok: true, error: null });
    expect(valid.rpc).toHaveBeenCalledWith("use_mfa_recovery_code", { code: "abcde-fghjk" });
    expect(valid.refreshSession).toHaveBeenCalled();

    const invalid = fakeClient({ data: false, error: null });
    expect(await redeemRecoveryCode(invalid.client, "errado")).toEqual({ ok: false, error: "Código inválido ou já usado." });
    expect(invalid.refreshSession).not.toHaveBeenCalled();
  });

  it("avisa sobre o limite de tentativas", async () => {
    const { client } = fakeClient({ data: null, error: { message: "too_many_attempts" } });
    expect((await redeemRecoveryCode(client, "x")).error).toMatch(/Muitas tentativas/);
    expect((await verifyCurrentPassword(client, "x")).error).toMatch(/Muitas tentativas/);
  });

  it("arquivo traz a conta, os códigos e o aviso de uso único", () => {
    const text = recoveryCodesFile(["abcde-fghjk"], "ana@exemplo.com", new Date(2026, 9, 11, 9, 0));
    expect(text).toContain("Conta: ana@exemplo.com");
    expect(text).toContain("abcde-fghjk");
    expect(text).toContain("vale uma vez");
  });
});

describe("confirmação pela senha atual", () => {
  it("senha errada não confirma", async () => {
    const { client } = fakeClient({ data: false, error: null });
    expect(await verifyCurrentPassword(client, "errada")).toEqual({ ok: false, error: "Senha incorreta." });
  });
});

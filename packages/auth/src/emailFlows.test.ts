import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { changePassword, emailRedirect, requestEmailLogin, requestReauthentication, verifyEmailLogin } from "./emailFlows";

function mockClient(method: string, result: object = { error: null }) {
  const call = vi.fn().mockResolvedValue(result);
  return { client: { auth: { [method]: call } } as unknown as SupabaseClient<Database>, call };
}
afterEach(() => vi.unstubAllGlobals());
describe("fluxos de e-mail", () => {
  it("acesso sem senha não cria contas e mantém captcha", async () => {
    const { client, call } = mockClient("signInWithOtp");
    await requestEmailLogin(client, " ANA@EXEMPLO.COM ", "captcha");
    expect(call).toHaveBeenCalledWith({ email: "ana@exemplo.com", options: { shouldCreateUser: false, captchaToken: "captcha", emailRedirectTo: "https://qqorvex-app.pages.dev/login" } });
  });
  it("código expirado retorna erro e não indica sucesso", async () => {
    const { client, call } = mockClient("verifyOtp", { error: { code: "otp_expired", message: "expired", status: 403 } });
    const result = await verifyEmailLogin(client, " ANA@EXEMPLO.COM ", " 123456 ");
    expect(call).toHaveBeenCalledWith({ email: "ana@exemplo.com", token: "123456", type: "email" });
    expect(result.error).toContain("expirado");
  });
  it("exige reautenticação somente quando o servidor solicitar", async () => {
    const { client } = mockClient("updateUser", { error: { code: "reauthentication_needed", message: "required" } });
    expect((await changePassword(client, "NovaSenha1!" )).requiresReauthentication).toBe(true);
  });
  it("envia o nonce ao atualizar a senha e propaga falhas", async () => {
    const { client, call } = mockClient("updateUser", { error: { code: "reauthentication_not_valid", message: "invalid" } });
    expect((await changePassword(client, "NovaSenha1!", " 123456 ")).error).toContain("inválido");
    expect(call).toHaveBeenCalledWith({ password: "NovaSenha1!", nonce: "123456" });
  });
  it("informa falha no envio da reautenticação", async () => {
    const { client } = mockClient("reauthenticate", { error: { message: "rate limit", status: 429 } });
    expect((await requestReauthentication(client)).error).toContain("Aguarde");
  });
  it("links nativos usam o app web e links web preservam o domínio", () => {
    vi.stubGlobal("window", { location: { protocol: "http:", hostname: "tauri.localhost", origin: "http://tauri.localhost" } });
    expect(emailRedirect("/redefinir-senha")).toBe("https://qqorvex-app.pages.dev/redefinir-senha");
    vi.stubGlobal("window", { location: { protocol: "https:", hostname: "preview.pages.dev", origin: "https://preview.pages.dev" } });
    expect(emailRedirect()).toBe("https://preview.pages.dev/login");
  });
});

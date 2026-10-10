import { describe, expect, it } from "vitest";
import { isAuthSessionError, retryQueryDelay } from "./sessionRecovery";

describe("isAuthSessionError", () => {
  it("reconhece token vencido ou inválido vindo do PostgREST e do gateway", () => {
    expect(isAuthSessionError({ code: "PGRST301", message: "JWT expired", details: null, hint: null })).toBe(true);
    expect(isAuthSessionError({ code: "PGRST303", message: "JWT expired" })).toBe(true);
    expect(isAuthSessionError({ message: "Invalid JWT" })).toBe(true);
    expect(isAuthSessionError({ status: 401, message: "Unauthorized" })).toBe(true);
  });

  it("não trata erros de dados ou de permissão como sessão vencida", () => {
    expect(isAuthSessionError({ code: "42501", message: "permission denied for table tasks" })).toBe(false);
    expect(isAuthSessionError({ code: "23505", message: "duplicate key value violates unique constraint" })).toBe(false);
    expect(isAuthSessionError(new Error("Conclua os pré-requisitos antes de avançar esta tarefa."))).toBe(false);
    expect(isAuthSessionError(null)).toBe(false);
  });
});

describe("retryQueryDelay", () => {
  it("espera a renovação do token após 401 e usa recuo exponencial nos demais erros", () => {
    expect(retryQueryDelay(0, { code: "PGRST301", message: "JWT expired" })).toBe(1_500);
    expect(retryQueryDelay(0, new Error("rede"))).toBe(1_000);
    expect(retryQueryDelay(10, new Error("rede"))).toBe(30_000);
  });
});

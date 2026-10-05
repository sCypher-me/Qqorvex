import { describe, expect, it } from "vitest";
import { mapAuthError } from "./authErrors";

function makeAuthError(code: string, message: string, status = 400) {
  return { name: "AuthError", code, message, status } as Parameters<typeof mapAuthError>[0];
}

describe("mapAuthError", () => {
  it("explains when signup cannot send its confirmation email", () => {
    const error = makeAuthError("unexpected_failure", "Error sending confirmation email", 500);

    expect(mapAuthError(error, { operation: "signUp" })).toContain("e-mail de confirmação");
    expect(mapAuthError(error)).toBe("Não foi possível concluir. Tente novamente em instantes.");
  });

  it("explains CAPTCHA and rejected email errors", () => {
    expect(mapAuthError(makeAuthError("captcha_failed", "CAPTCHA verification failed"))).toContain("verificação de segurança");
    expect(mapAuthError(makeAuthError("email_address_invalid", "Invalid email address"))).toContain("endereço de e-mail");
    expect(mapAuthError(makeAuthError("email_address_not_authorized", "Email address not authorized"))).toContain("não está autorizado");
  });

  it("keeps login credential errors generic", () => {
    expect(mapAuthError(makeAuthError("invalid_credentials", "Invalid login credentials"))).toBe("E-mail ou senha incorretos.");
  });
});

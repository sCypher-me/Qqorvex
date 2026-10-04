import { describe, expect, it, vi } from "vitest";
import { isValidEmail, joinWaitlist } from "./waitlist";

describe("isValidEmail", () => {
  it("aceita e-mails comuns, com espaços e maiúsculas", () => {
    expect(isValidEmail(" Ana@Exemplo.com ")).toBe(true);
    expect(isValidEmail("a.b+beta@mail.co")).toBe(true);
  });

  it("recusa formatos inválidos", () => {
    for (const value of ["", "ana", "ana@", "ana@exemplo", "a b@exemplo.com", "@exemplo.com"]) expect(isValidEmail(value)).toBe(false);
  });
});

describe("joinWaitlist", () => {
  const options = (response: Response) => ({ supabaseUrl: "https://x.supabase.co", fetchImpl: vi.fn(async () => response) as unknown as typeof fetch });

  it("envia o e-mail normalizado, o token e o campo-armadilha", async () => {
    const opts = options(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    expect(await joinWaitlist({ email: " Ana@Exemplo.com ", turnstileToken: "t", website: "" }, opts)).toEqual({ ok: true });
    const [url, init] = (opts.fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toBe("https://x.supabase.co/functions/v1/waitlist-join");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ email: "ana@exemplo.com", turnstileToken: "t", website: "", source: "site" });
  });

  it("mostra a mensagem do servidor quando recusa", async () => {
    const result = await joinWaitlist({ email: "ana@exemplo.com", turnstileToken: "t", website: "" }, options(new Response(JSON.stringify({ error: "Muitas tentativas. Tente de novo mais tarde." }), { status: 429 })));
    expect(result).toEqual({ ok: false, error: "Muitas tentativas. Tente de novo mais tarde." });
  });

  it("não chama o servidor sem e-mail válido ou sem verificação", async () => {
    const opts = options(new Response("{}"));
    expect((await joinWaitlist({ email: "ana", turnstileToken: "t", website: "" }, opts)).ok).toBe(false);
    expect((await joinWaitlist({ email: "ana@exemplo.com", turnstileToken: "", website: "" }, opts)).ok).toBe(false);
    expect(opts.fetchImpl).not.toHaveBeenCalled();
  });

  it("falha de rede vira mensagem amigável", async () => {
    const result = await joinWaitlist(
      { email: "ana@exemplo.com", turnstileToken: "t", website: "" },
      { supabaseUrl: "https://x.supabase.co", fetchImpl: (async () => { throw new TypeError("offline"); }) as unknown as typeof fetch },
    );
    expect(result).toEqual({ ok: false, error: "Sem conexão com o servidor. Confira sua internet e tente de novo." });
  });
});

/**
 * Inscrição na lista de espera. A validação aqui só evita viagens desnecessárias — quem decide é a
 * Edge Function `waitlist-join` (Turnstile, limite por IP e e-mail válido no banco).
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  const email = normalizeEmail(raw);
  return email.length >= 6 && email.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export type WaitlistResult = { ok: true } | { ok: false; error: string };

export async function joinWaitlist(
  input: { email: string; turnstileToken: string; website: string },
  options: { supabaseUrl: string; fetchImpl?: typeof fetch },
): Promise<WaitlistResult> {
  if (!isValidEmail(input.email)) return { ok: false, error: "Confira o e-mail digitado." };
  if (!input.turnstileToken) return { ok: false, error: "Conclua a verificação de segurança." };
  const doFetch = options.fetchImpl ?? fetch;
  try {
    const response = await doFetch(`${options.supabaseUrl}/functions/v1/waitlist-join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizeEmail(input.email), turnstileToken: input.turnstileToken, website: input.website, source: "site" }),
    });
    const body = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (response.ok && body.ok) return { ok: true };
    return { ok: false, error: body.error ?? "Não foi possível entrar na lista agora. Tente de novo em instantes." };
  } catch {
    return { ok: false, error: "Sem conexão com o servidor. Confira sua internet e tente de novo." };
  }
}

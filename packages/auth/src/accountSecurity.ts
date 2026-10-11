import type { SupabaseClient, Database } from "@qqorvex/database";

/**
 * Códigos de recuperação do 2FA e confirmação de identidade para ações sensíveis. Tudo passa por
 * funções `security definer` (migração `account_security`): os códigos ficam só como hash, há
 * limite de tentativas, e gerar códigos exige a sessão em aal2.
 */

function friendlyError(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  if (message.includes("too_many_attempts")) return "Muitas tentativas erradas. Espere um pouco e tente de novo.";
  if (message.includes("mfa_required")) return "Confirme com o app autenticador antes de continuar.";
  return fallback;
}

/** Gera 10 códigos novos (os anteriores deixam de valer). Mostrados uma única vez. */
export async function generateRecoveryCodes(client: SupabaseClient<Database>): Promise<{ codes: string[]; error: string | null }> {
  const { data, error } = await client.rpc("generate_mfa_recovery_codes");
  if (error || !data) return { codes: [], error: friendlyError(error?.message, "Não foi possível gerar os códigos. Tente de novo.") };
  return { codes: data, error: null };
}

export async function countRecoveryCodes(client: SupabaseClient<Database>): Promise<number | null> {
  const { data, error } = await client.rpc("count_mfa_recovery_codes");
  return error ? null : (data ?? 0);
}

/**
 * Usa um código no login (2FA pendente). Se valer, o 2FA sai da conta e a sessão é renovada para
 * a pessoa entrar e cadastrar o autenticador de novo.
 */
export async function redeemRecoveryCode(client: SupabaseClient<Database>, code: string): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await client.rpc("use_mfa_recovery_code", { code });
  if (error) return { ok: false, error: friendlyError(error.message, "Não foi possível validar o código. Tente de novo.") };
  if (!data) return { ok: false, error: "Código inválido ou já usado." };
  await client.auth.refreshSession();
  return { ok: true, error: null };
}

export async function hasPassword(client: SupabaseClient<Database>): Promise<boolean> {
  const { data, error } = await client.rpc("i_have_password");
  return !error && Boolean(data);
}

export async function verifyCurrentPassword(client: SupabaseClient<Database>, password: string): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await client.rpc("verify_my_password", { password });
  if (error) return { ok: false, error: friendlyError(error.message, "Não foi possível confirmar a senha. Tente de novo.") };
  return data ? { ok: true, error: null } : { ok: false, error: "Senha incorreta." };
}

/** Texto para salvar os códigos num arquivo. */
export function recoveryCodesFile(codes: string[], email: string | null | undefined, now = new Date()): string {
  return [
    "Qqorvex — códigos de recuperação da verificação em duas etapas",
    email ? `Conta: ${email}` : null,
    `Gerados em: ${now.toLocaleString("pt-BR")}`,
    "",
    "Cada código vale uma vez. Use se perder o acesso ao app autenticador.",
    "Gerar novos códigos invalida estes.",
    "",
    ...codes,
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

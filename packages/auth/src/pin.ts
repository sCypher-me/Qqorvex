import type { SupabaseClient, Database } from "@qqorvex/database";

/**
 * PIN do Cofre (docs/decisions/central-seguranca-pin-design.md) — destrava só o Cofre de
 * Documentos, não o app inteiro. Validado no servidor via funções `security definer`
 * (`has_security_pin`/`set_security_pin`/`verify_security_pin`), nunca comparado no cliente.
 */
export async function hasSecurityPin(client: SupabaseClient<Database>): Promise<boolean> {
  const { data, error } = await client.rpc("has_security_pin");
  if (error || data === null) return false;
  return data;
}

/** `currentPin` é obrigatório se o usuário já tem um PIN cadastrado — a função recusa trocar sem ele. */
export async function setSecurityPin(
  client: SupabaseClient<Database>,
  newPin: string,
  currentPin?: string,
): Promise<{ error: string | null }> {
  const { error } = await client.rpc("set_security_pin", { new_pin: newPin, current_pin: currentPin });
  return { error: error?.message ?? null };
}

/** `true` se o PIN estiver correto (e não bloqueado por tentativas erradas); `false` caso contrário. */
export async function verifySecurityPin(client: SupabaseClient<Database>, candidatePin: string): Promise<boolean> {
  const { data, error } = await client.rpc("verify_security_pin", { candidate_pin: candidatePin });
  if (error || data === null) return false;
  return data;
}

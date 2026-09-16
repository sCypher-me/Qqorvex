import type { SupabaseClient, Database } from "@qqorvex/database";

/**
 * "2FA" via TOTP nativo do Supabase Auth (`auth.mfa`) — sem schema próprio, sem custo adicional
 * (já incluso no free tier). Nenhum segredo passa pelo nosso banco: o Supabase guarda e valida o
 * fator, nós só orquestramos enroll → challenge → verify.
 *
 * Nota: `client.auth.mfa.webauthn` existe nos tipos do supabase-js mas não é uma funcionalidade
 * ativa no Supabase Cloud hoje (a doc oficial de MFA só lista TOTP e telefone como fatores
 * suportados) — dá erro "MFA enroll is disabled for WebAuthn" mesmo com Passkeys habilitado no
 * painel. Passkey de verdade é outra API inteira, sem relação com MFA: ver `./passkey.ts`.
 */
export interface MfaFactor {
  id: string;
  friendlyName: string | null;
  status: "verified" | "unverified";
}

export interface TotpEnrollment {
  factorId: string;
  /** Data URI pronta pra usar num <img src=...> — o Supabase retorna SVG cru, não URI. */
  qrCodeDataUri: string;
  secret: string;
}

export async function enrollTotp(client: SupabaseClient<Database>): Promise<{ enrollment: TotpEnrollment | null; error: string | null }> {
  const { data, error } = await client.auth.mfa.enroll({ factorType: "totp" });
  if (error || !data) return { enrollment: null, error: error?.message ?? "Não foi possível iniciar o 2FA." };
  return {
    enrollment: {
      factorId: data.id,
      qrCodeDataUri: `data:image/svg+xml;utf-8,${encodeURIComponent(data.totp.qr_code)}`,
      secret: data.totp.secret,
    },
    error: null,
  };
}

async function challengeAndVerify(client: SupabaseClient<Database>, factorId: string, code: string): Promise<{ error: string | null }> {
  const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId });
  if (challengeError || !challenge) return { error: challengeError?.message ?? "Não foi possível gerar o desafio de verificação." };

  const { error: verifyError } = await client.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
  return { error: verifyError?.message ?? null };
}

/** Confirma o cadastro de um fator recém-criado (`enrollTotp`) com o código do app autenticador. */
export const verifyTotpEnrollment = challengeAndVerify;

/** Verifica o código durante o login (sessão já existe em `aal1`, precisa subir pra `aal2`). */
export const verifyTotpChallenge = challengeAndVerify;

export async function unenrollFactor(client: SupabaseClient<Database>, factorId: string): Promise<{ error: string | null }> {
  const { error } = await client.auth.mfa.unenroll({ factorId });
  return { error: error?.message ?? null };
}

export async function listMfaFactors(client: SupabaseClient<Database>): Promise<MfaFactor[]> {
  const { data, error } = await client.auth.mfa.listFactors();
  if (error || !data) return [];
  return data.totp.map((f) => ({ id: f.id, friendlyName: f.friendly_name ?? null, status: f.status }));
}

export interface AssuranceLevel {
  current: string | null;
  next: string | null;
}

/** `next > current` significa que a sessão está em `aal1` mas precisa completar o 2FA pra `aal2`. */
export async function getAssuranceLevel(client: SupabaseClient<Database>): Promise<AssuranceLevel> {
  const { data } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  return { current: data?.currentLevel ?? null, next: data?.nextLevel ?? null };
}

export function isMfaPending(level: AssuranceLevel): boolean {
  return level.next === "aal2" && level.current !== level.next;
}

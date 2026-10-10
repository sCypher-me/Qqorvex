// Leitura de `app_secrets` pelas Edge Functions, com nova tentativa.
//
// O PostgREST às vezes recusa a primeira chamada de uma função recém-iniciada (401 transitório,
// visto nos logs dos crons). Antes, o erro era ignorado: o segredo vinha vazio e a rodada inteira do
// cron respondia "Unauthorized" — lembretes e sincronizações ficavam para o ciclo seguinte. Agora a
// leitura tenta de novo e, se ainda falhar, a função responde 503 (falha de infraestrutura), sem
// confundir com um segredo de cron incorreto (401).
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const RETRY_DELAYS_MS = [250, 750];

export class AppSecretsUnavailableError extends Error {
  constructor(cause: unknown) {
    super("Não foi possível ler app_secrets.");
    this.name = "AppSecretsUnavailableError";
    this.cause = cause;
  }
}

type SecretRow = { key: string; value: string };
type SecretQuery = () => PromiseLike<{ data: SecretRow[] | null; error: unknown }>;

/** Executa a consulta com até três tentativas; só desiste se todas devolverem erro. */
export async function withSecretRetry(
  query: SecretQuery,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<SecretRow[]> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) await wait(RETRY_DELAYS_MS[attempt - 1]!);
    const { data, error } = await query();
    if (!error) return data ?? [];
    lastError = error;
  }
  throw new AppSecretsUnavailableError(lastError);
}

/** Lê várias chaves de uma vez. Chaves ausentes simplesmente não aparecem no resultado. */
export async function readAppSecrets(client: SupabaseClient, keys: string[]): Promise<Record<string, string>> {
  const rows = await withSecretRetry(() => client.from("app_secrets").select("key, value").in("key", keys));
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

/**
 * Confere o header `x-cron-secret` contra `cron_secret`. Devolve `null` quando autorizado, ou a
 * resposta a enviar: 401 para segredo errado/ausente, 503 quando o cofre não pôde ser lido.
 */
export async function verifyCronSecret(client: SupabaseClient, req: Request): Promise<Response | null> {
  let expected: string | undefined;
  try {
    expected = (await readAppSecrets(client, ["cron_secret"])).cron_secret;
  } catch (error) {
    console.error("cron: leitura do cron_secret falhou após novas tentativas", error);
    return new Response("Serviço temporariamente indisponível", { status: 503 });
  }
  if (!expected || req.headers.get("x-cron-secret") !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}

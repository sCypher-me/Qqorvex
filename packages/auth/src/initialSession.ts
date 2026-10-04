import type { Database, Session, SupabaseClient } from "@qqorvex/database";

const AUTH_BOOTSTRAP_TIMEOUT_MS = 8_000;

/** Resolve a sessão inicial sem permitir que uma rede pendente bloqueie a aplicação. */
export async function resolveInitialSession(
  client: SupabaseClient<Database>,
  timeoutMs = AUTH_BOOTSTRAP_TIMEOUT_MS,
): Promise<Session | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutFallback = new Promise<{ data: { session: null } }>((resolve) => {
    timeoutId = setTimeout(() => resolve({ data: { session: null } }), timeoutMs);
  });

  try {
    const { data } = await Promise.race([client.auth.getSession(), timeoutFallback]);
    return data.session;
  } catch {
    return null;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

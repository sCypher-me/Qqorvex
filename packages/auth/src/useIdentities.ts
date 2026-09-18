import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { listIdentities, linkIdentity, unlinkIdentity, type LinkedIdentity } from "./identities";
import type { OAuthProviderId } from "./oauth";

export function useIdentities(client: SupabaseClient<Database>) {
  const [identities, setIdentities] = useState<LinkedIdentity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIdentities(await listIdentities(client));
    setIsLoading(false);
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connect = useCallback((provider: OAuthProviderId) => linkIdentity(client, provider), [client]);

  const disconnect = useCallback(
    async (identity: LinkedIdentity) => {
      if (identities.length < 2) {
        return { error: "Esse é seu único método de acesso — configure outro antes de desconectar." };
      }
      const result = await unlinkIdentity(client, identity);
      if (!result.error) await refresh();
      return result;
    },
    [client, identities.length, refresh],
  );

  return { identities, isLoading, connect, disconnect, refresh };
}

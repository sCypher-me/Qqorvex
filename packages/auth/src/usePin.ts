import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { hasSecurityPin } from "./pin";

export function usePin(client: SupabaseClient<Database>) {
  const [hasPin, setHasPin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setHasPin(await hasSecurityPin(client));
    } catch {
      // Keep the last valid state when the security PIN RPC fails unexpectedly.
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { hasPin, isLoading, refresh };
}

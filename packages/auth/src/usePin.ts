import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { hasSecurityPin } from "./pin";

export function usePin(client: SupabaseClient<Database>) {
  const [hasPin, setHasPin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await hasSecurityPin(client);
    setHasPin(result);
    setIsLoading(false);
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { hasPin, isLoading, refresh };
}

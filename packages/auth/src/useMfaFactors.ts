import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { listMfaFactors, type MfaFactor } from "./mfa";

export function useMfaFactors(client: SupabaseClient<Database>) {
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setFactors(await listMfaFactors(client));
    } catch {
      // Keep the last valid factor list when the Auth API fails unexpectedly.
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { factors, isLoading, refresh };
}

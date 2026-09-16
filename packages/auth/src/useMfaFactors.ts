import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { listMfaFactors, type MfaFactor } from "./mfa";

export function useMfaFactors(client: SupabaseClient<Database>) {
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await listMfaFactors(client);
    setFactors(result);
    setIsLoading(false);
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { factors, isLoading, refresh };
}

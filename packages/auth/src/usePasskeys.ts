import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { listPasskeys, type Passkey } from "./passkey";

export function usePasskeys(client: SupabaseClient<Database>) {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await listPasskeys(client);
    setPasskeys(result);
    setIsLoading(false);
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { passkeys, isLoading, refresh };
}

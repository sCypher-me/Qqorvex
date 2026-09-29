import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { listPasskeys, type Passkey } from "./passkey";

export function usePasskeys(client: SupabaseClient<Database>) {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setPasskeys(await listPasskeys(client));
    } catch {
      // Keep the last valid list when WebAuthn/Auth is unavailable.
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { passkeys, isLoading, refresh };
}

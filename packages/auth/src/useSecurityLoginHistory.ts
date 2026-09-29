import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { listMySecurityLoginHistory, type SecurityLoginEvent } from "./securityHistory";

export function useSecurityLoginHistory(client: SupabaseClient<Database>) {
  const [events, setEvents] = useState<SecurityLoginEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const result = await listMySecurityLoginHistory(client);
    setEvents(result.events);
    setError(result.error);
    setIsLoading(false);
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { events, isLoading, error, refresh };
}

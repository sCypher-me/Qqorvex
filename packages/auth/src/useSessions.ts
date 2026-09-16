import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { getCurrentSessionId, listSessions, type DeviceSession } from "./sessions";

export function useSessions(client: SupabaseClient<Database>) {
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [sessionsResult, currentId] = await Promise.all([listSessions(client), getCurrentSessionId(client)]);
    setSessions(sessionsResult);
    setCurrentSessionId(currentId);
    setIsLoading(false);
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sessions, currentSessionId, isLoading, refresh };
}

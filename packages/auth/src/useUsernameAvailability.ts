import { useEffect, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { checkUsernameAvailable, isUsernameFormatValid } from "./username";

export type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

/** Debounced (400ms) — evita 1 requisição por tecla digitada. Campo vazio (username opcional) fica "idle". */
export function useUsernameAvailability(client: SupabaseClient<Database>, username: string): UsernameStatus {
  const [status, setStatus] = useState<UsernameStatus>("idle");

  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      setStatus("idle");
      return;
    }
    if (!isUsernameFormatValid(trimmed)) {
      setStatus("invalid");
      return;
    }
    setStatus("checking");
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(client, trimmed);
        if (!cancelled) setStatus(available ? "available" : "taken");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [client, username]);

  return status;
}

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { getProfile, updateProfile, type Profile, type ProfileInput } from "./profile";

export function useProfile(client: SupabaseClient<Database>, userId: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setError(null);
      const result = await getProfile(client, userId);
      setProfile(result);
    } catch (caught) {
      setProfile(null);
      setError(caught);
    } finally {
      setIsLoading(false);
    }
  }, [client, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (input: ProfileInput) => {
      const { profile: updated, error } = await updateProfile(client, userId, input);
      if (updated) setProfile(updated);
      return { error };
    },
    [client, userId],
  );

  return { profile, isLoading, error, refresh, save };
}

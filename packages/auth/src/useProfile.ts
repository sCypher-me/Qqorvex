import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient, Database } from "@qqorvex/database";
import { getProfile, updateProfile, type Profile, type ProfileInput } from "./profile";

export function useProfile(client: SupabaseClient<Database>, userId: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await getProfile(client, userId);
    setProfile(result);
    setIsLoading(false);
  }, [client, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (input: ProfileInput) => {
      const { profile: updated, error } = await updateProfile(client, userId, input);
      if (updated) setProfile(updated);
      return { error };
    },
    [client, userId],
  );

  return { profile, isLoading, refresh, save };
}

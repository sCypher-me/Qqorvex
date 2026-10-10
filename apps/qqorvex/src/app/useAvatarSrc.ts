import { useQuery } from "@tanstack/react-query";
import { PROFILE_AVATAR_LINK_SECONDS, signProfileAvatarUrl } from "@qqorvex/auth";
import { supabase } from "./supabase";

/**
 * Endereço exibível da foto de perfil: link temporário para a foto guardada no Qqorvex (bucket
 * privado) ou a própria URL externa. Renova antes de o link vencer; enquanto carrega, `null`
 * (o Avatar mostra a inicial).
 */
export function useAvatarSrc(avatarUrl: string | null | undefined, userId: string | null | undefined): string | null {
  const refreshMs = (PROFILE_AVATAR_LINK_SECONDS - 10 * 60) * 1000;
  const { data } = useQuery({
    queryKey: ["profile-avatar-src", userId, avatarUrl ?? null],
    queryFn: () => signProfileAvatarUrl(supabase, avatarUrl, userId ?? ""),
    enabled: Boolean(avatarUrl && userId),
    staleTime: refreshMs,
    refetchInterval: refreshMs,
    gcTime: PROFILE_AVATAR_LINK_SECONDS * 1000,
  });
  return avatarUrl ? data ?? null : null;
}

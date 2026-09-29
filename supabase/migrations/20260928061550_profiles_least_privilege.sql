-- Restringe profiles a leitura autenticada das colunas públicas do perfil e às alterações
-- de apresentação feitas pelo próprio usuário. PIN e privilégios de conta ficam fora do cliente.
revoke all on table public.profiles from public, anon, authenticated;

grant select (
  id,
  display_name,
  username,
  avatar_url,
  bio,
  created_at,
  updated_at,
  role,
  account_tier,
  full_name,
  phone,
  selected_title,
  selected_badge_keys
) on public.profiles to authenticated;

grant update (
  display_name,
  username,
  avatar_url,
  bio,
  full_name,
  phone,
  selected_title,
  selected_badge_keys
) on public.profiles to authenticated;

alter policy "profiles_select_own" on public.profiles
  to authenticated using ((select auth.uid()) = id);

alter policy "profiles_update_own" on public.profiles
  to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

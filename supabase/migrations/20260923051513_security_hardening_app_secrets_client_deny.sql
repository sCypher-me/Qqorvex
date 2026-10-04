alter table public.app_secrets enable row level security;

drop policy if exists "app_secrets_deny_client_access" on public.app_secrets;

create policy "app_secrets_deny_client_access"
  on public.app_secrets
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.app_secrets from anon, authenticated;

-- Corrige achados do security advisor sobre a migration de profiles:
-- 1) search_path mutável em set_updated_at
-- 2) extensão citext instalada no schema public
-- 3) handle_new_user (SECURITY DEFINER) exposta via RPC para anon/authenticated

create schema if not exists extensions;

alter extension citext set schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public;

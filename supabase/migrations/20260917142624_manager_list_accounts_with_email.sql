-- Gestão de contas do Painel Manager precisa do e-mail (fica em auth.users, não em
-- public.profiles) — junção só acontece aqui, dentro de SECURITY DEFINER restrito ao dono.
create or replace function public.list_all_accounts()
returns table (
  id uuid,
  email text,
  display_name text,
  username citext,
  role text,
  account_tier text,
  created_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select p.id, u.email, p.display_name, p.username, p.role, p.account_tier, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_owner()
  order by p.created_at desc;
$$;

revoke execute on function public.list_all_accounts() from public, anon;
grant execute on function public.list_all_accounts() to authenticated;

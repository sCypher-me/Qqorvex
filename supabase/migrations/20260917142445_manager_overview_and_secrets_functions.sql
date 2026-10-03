-- Visão geral do sistema (Painel Manager) — só contagens agregadas, nunca dado de linha, então
-- não precisa abrir RLS "dono vê tudo" em cada tabela de domínio (superfície de risco bem menor).
create or replace function public.get_system_overview()
returns table (
  total_users bigint,
  total_tasks bigint,
  total_events bigint,
  total_transactions bigint,
  total_documents bigint,
  total_pages bigint
)
language sql
security definer
set search_path = ''
as $$
  select
    (select count(*) from auth.users),
    (select count(*) from public.tasks),
    (select count(*) from public.events),
    (select count(*) from public.transactions),
    (select count(*) from public.documents),
    (select count(*) from public.pages)
  where public.is_owner();
$$;

revoke execute on function public.get_system_overview() from public, anon;
grant execute on function public.get_system_overview() to authenticated;

-- Config global (chaves em app_secrets) — só o Dono, e só write/existência, nunca lê o valor de
-- volta pro cliente (mesmo espírito de "secret" write-only de CI/CD: evita expor a chave real no
-- DevTools/rede mesmo pro próprio dono).
create or replace function public.list_secret_keys()
returns table (key text, has_value boolean, updated_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select s.key, (s.value is not null and length(s.value) > 0), s.updated_at
  from public.app_secrets s
  where public.is_owner()
  order by s.key;
$$;

create or replace function public.set_secret(input_key text, input_value text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_owner() then
    raise exception 'Só o dono pode alterar configurações.';
  end if;
  insert into public.app_secrets (key, value, updated_at)
  values (input_key, input_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$$;

revoke execute on function public.list_secret_keys() from public, anon;
grant execute on function public.list_secret_keys() to authenticated;
revoke execute on function public.set_secret(text, text) from public, anon;
grant execute on function public.set_secret(text, text) to authenticated;

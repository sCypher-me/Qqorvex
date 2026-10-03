-- Central de Segurança — sessões/dispositivos (docs/decisions/central-seguranca-sessoes-design.md).
-- O schema auth não é exposto pela API automática do Supabase por segurança, então listar/revogar
-- sessões individuais exige funções próprias (security definer), não uma tabela com RLS normal.
create or replace function public.list_my_sessions()
returns table (id uuid, created_at timestamptz, refreshed_at timestamptz, not_after timestamptz, user_agent text, ip text)
language sql security definer set search_path = ''
as $$
  select s.id, s.created_at, s.refreshed_at, s.not_after, s.user_agent, s.ip::text
  from auth.sessions s where s.user_id = auth.uid()
  order by coalesce(s.refreshed_at, s.created_at) desc;
$$;

create or replace function public.revoke_my_session(target_session_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if target_session_id = (auth.jwt() ->> 'session_id')::uuid then
    raise exception 'Não é possível revogar a sessão atual por aqui.';
  end if;
  delete from auth.sessions where id = target_session_id and user_id = auth.uid();
end;
$$;

grant execute on function public.list_my_sessions() to authenticated;
grant execute on function public.revoke_my_session(uuid) to authenticated;

create or replace function public.list_my_security_login_history()
returns table (
  id uuid,
  occurred_at timestamptz,
  action text,
  ip_address text,
  user_agent text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    entry.id,
    entry.created_at as occurred_at,
    entry.payload ->> 'action' as action,
    nullif(entry.ip_address, '') as ip_address,
    nullif(entry.payload ->> 'user_agent', '') as user_agent
  from auth.audit_log_entries as entry
  where coalesce(
      entry.payload ->> 'user_id',
      entry.payload ->> 'actor_id',
      entry.payload #>> '{user,id}'
    ) = auth.uid()::text
    and entry.created_at >= now() - interval '90 days'
    and entry.payload ->> 'action' in ('login', 'user_signedup')
  order by entry.created_at desc
  limit 100;
$$;

revoke all on function public.list_my_security_login_history() from public;
revoke all on function public.list_my_security_login_history() from anon;
grant execute on function public.list_my_security_login_history() to authenticated;

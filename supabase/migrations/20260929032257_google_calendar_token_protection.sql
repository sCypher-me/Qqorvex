-- Refresh tokens do not belong in a browser-readable table. Only the server-side
-- Google Calendar functions may read or mutate this connection record.
revoke all on table public.google_calendar_connections from public, anon, authenticated;

drop policy if exists "google_calendar_connections_select_own" on public.google_calendar_connections;
drop policy if exists "google_calendar_connections_delete_own" on public.google_calendar_connections;

create or replace function public.has_google_calendar_connection()
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1
    from public.google_calendar_connections as connection
    where connection.user_id = auth.uid()
  );
$$;

revoke all on function public.has_google_calendar_connection() from public;
revoke all on function public.has_google_calendar_connection() from anon;
grant execute on function public.has_google_calendar_connection() to authenticated;

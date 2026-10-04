-- Lista de espera do beta (site de apresentação).
--
-- Ninguém de fora lê nem escreve direto: a Edge Function `waitlist-join` confere o Turnstile e
-- chama `waitlist_register` com a service_role. O Dono vê e marca convidados pela Central do Dono.

create table public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique
    check (email = lower(email) and length(email) between 6 and 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source text not null default 'site' check (length(source) between 1 and 40),
  created_at timestamptz not null default now(),
  invited_at timestamptz
);

alter table public.waitlist_signups enable row level security;
revoke all on public.waitlist_signups from public, anon, authenticated;
grant select, update (invited_at) on public.waitlist_signups to authenticated;
create policy waitlist_owner_select on public.waitlist_signups
  for select to authenticated using ((select public.is_owner()));
create policy waitlist_owner_update on public.waitlist_signups
  for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

-- Tentativas por IP (guardado só como hash): no máximo 5 por hora.
create table app_private.waitlist_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  attempted_at timestamptz not null default now()
);
create index waitlist_attempts_ip_idx on app_private.waitlist_attempts (ip_hash, attempted_at desc);
revoke all on app_private.waitlist_attempts from public, anon, authenticated;

-- Resposta igual para e-mail novo ou repetido ('ok'): o site nunca revela quem já está na lista.
create or replace function public.waitlist_register(p_email text, p_ip_hash text, p_source text default 'site')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text := lower(btrim(coalesce(p_email, '')));
  recent integer;
begin
  if coalesce(p_ip_hash, '') = '' then
    return 'invalid';
  end if;

  delete from app_private.waitlist_attempts where attempted_at < now() - interval '1 day';
  select count(*) into recent from app_private.waitlist_attempts
    where ip_hash = p_ip_hash and attempted_at > now() - interval '1 hour';
  if recent >= 5 then
    return 'rate_limited';
  end if;
  insert into app_private.waitlist_attempts (ip_hash) values (p_ip_hash);

  if length(normalized) not between 6 and 254 or normalized !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return 'invalid';
  end if;

  insert into public.waitlist_signups (email, source)
  values (normalized, left(coalesce(nullif(btrim(p_source), ''), 'site'), 40))
  on conflict (email) do nothing;
  return 'ok';
end;
$$;

revoke all on function public.waitlist_register(text, text, text) from public, anon, authenticated;
grant execute on function public.waitlist_register(text, text, text) to service_role;

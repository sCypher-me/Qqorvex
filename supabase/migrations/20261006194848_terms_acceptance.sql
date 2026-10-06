-- Store an auditable record for explicit acceptance of the published terms version.
create table if not exists public.user_terms_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  source text not null check (source in ('email_signup', 'signup_gate', 'oauth_registration', 'invite_acceptance')),
  primary key (user_id, terms_version)
);

-- New accounts created through a provider or an invitation must accept the current version
-- before the application shell becomes available. This state is server-side, not user metadata.
create table if not exists app_private.user_terms_acceptance_requirements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  required_version text not null
);

alter table public.user_terms_acceptances enable row level security;
alter table app_private.user_terms_acceptance_requirements enable row level security;
revoke all on public.user_terms_acceptances from public, anon, authenticated;
revoke all on app_private.user_terms_acceptance_requirements from public, anon, authenticated;
grant select on public.user_terms_acceptances to authenticated;

drop policy if exists user_terms_acceptances_select_own on public.user_terms_acceptances;
create policy user_terms_acceptances_select_own
  on public.user_terms_acceptances for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.requires_current_terms_acceptance()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from app_private.user_terms_acceptance_requirements as requirement
    where requirement.user_id = auth.uid()
      and requirement.required_version = '2026-10-06-v1'
  );
$$;

revoke all on function public.requires_current_terms_acceptance() from public, anon;
grant execute on function public.requires_current_terms_acceptance() to authenticated;

create or replace function public.record_user_terms_acceptance(
  p_terms_version text,
  p_source text default 'signup_gate'
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  recorded_at timestamptz;
begin
  if actor_id is null then
    raise exception 'Autenticação necessária.' using errcode = '28000';
  end if;
  if p_terms_version is distinct from '2026-10-06-v1' then
    raise exception 'Versão dos Termos inválida ou desatualizada.' using errcode = '22023';
  end if;
  if p_source is null or p_source not in ('signup_gate', 'oauth_registration', 'invite_acceptance') then
    raise exception 'Origem de aceitação inválida.' using errcode = '22023';
  end if;

  insert into public.user_terms_acceptances (user_id, terms_version, source)
  values (actor_id, p_terms_version, p_source)
  on conflict (user_id, terms_version) do nothing;

  select acceptance.accepted_at into recorded_at
  from public.user_terms_acceptances as acceptance
  where acceptance.user_id = actor_id and acceptance.terms_version = p_terms_version;
  delete from app_private.user_terms_acceptance_requirements as requirement
  where requirement.user_id = actor_id and requirement.required_version = p_terms_version;
  return recorded_at;
end;
$$;

revoke all on function public.record_user_terms_acceptance(text, text) from public, anon;
grant execute on function public.record_user_terms_acceptance(text, text) to authenticated;

create or replace function public.record_signup_terms_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_app_meta_data ->> 'provider' = 'email'
     and new.raw_user_meta_data ->> 'qqorvex_terms_version' = '2026-10-06-v1' then
    insert into public.user_terms_acceptances (user_id, terms_version, source)
    values (new.id, '2026-10-06-v1', 'email_signup')
    on conflict (user_id, terms_version) do nothing;
  else
    insert into app_private.user_terms_acceptance_requirements (user_id, required_version)
    values (new.id, '2026-10-06-v1')
    on conflict (user_id) do update set required_version = excluded.required_version;
  end if;
  return new;
end;
$$;

revoke all on function public.record_signup_terms_acceptance() from public, anon, authenticated;
drop trigger if exists qqorvex_record_signup_terms_acceptance on auth.users;
create trigger qqorvex_record_signup_terms_acceptance
  after insert on auth.users
  for each row execute function public.record_signup_terms_acceptance();

comment on table public.user_terms_acceptances is 'Server-timestamped acceptance history for Qqorvex terms versions.';

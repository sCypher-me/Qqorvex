-- Reconcile the gamification contract used by the application with the shared
-- production schema. This migration is intentionally additive and idempotent.

alter table public.gamification_stats
  add column if not exists checkin_days_completed integer not null default 0,
  add column if not exists quizzes_90_plus integer not null default 0;

create table if not exists public.user_daily_challenge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_date date not null,
  challenge_key text not null,
  progress integer not null default 0 check (progress >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, challenge_date, challenge_key)
);

create index if not exists user_daily_challenge_progress_user_date_idx
  on public.user_daily_challenge_progress (user_id, challenge_date);

alter table public.user_daily_challenge_progress enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_daily_challenge_progress'
      and policyname = 'daily_challenge_progress_select_own'
  ) then
    create policy daily_challenge_progress_select_own
      on public.user_daily_challenge_progress for select
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_daily_challenge_progress'
      and policyname = 'daily_challenge_progress_insert_own'
  ) then
    create policy daily_challenge_progress_insert_own
      on public.user_daily_challenge_progress for insert
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_daily_challenge_progress'
      and policyname = 'daily_challenge_progress_update_own'
  ) then
    create policy daily_challenge_progress_update_own
      on public.user_daily_challenge_progress for update
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end
$$;


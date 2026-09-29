-- Gamificação — métricas específicas para as conquistas de longo prazo.
-- A tabela base de gamificação já existe no banco compartilhado; o bloco condicional mantém
-- esta migration segura quando o ambiente ainda não recebeu a tabela base.

do $$
begin
  if to_regclass('public.gamification_stats') is not null then
    alter table public.gamification_stats
      add column if not exists checkin_days_completed integer not null default 0,
      add column if not exists quizzes_90_plus integer not null default 0;

    if to_regclass('public.daily_checkins') is not null then
      update public.gamification_stats stats
      set checkin_days_completed = greatest(stats.checkin_days_completed, totals.total_days)
      from (
        select user_id, count(*)::integer as total_days
        from public.daily_checkins
        group by user_id
      ) totals
      where stats.user_id = totals.user_id;
    end if;

    if to_regclass('public.quiz_attempts') is not null and to_regclass('public.quiz_questions') is not null then
      update public.gamification_stats stats
      set quizzes_90_plus = greatest(stats.quizzes_90_plus, totals.total_high_accuracy)
      from (
        select attempts.user_id,
               count(*) filter (where attempts.score::numeric / nullif(question_totals.total_questions, 0) >= 0.9)::integer as total_high_accuracy
        from public.quiz_attempts attempts
        join (
          select quiz_id, count(*)::numeric as total_questions
          from public.quiz_questions
          group by quiz_id
        ) question_totals on question_totals.quiz_id = attempts.quiz_id
        group by attempts.user_id
      ) totals
      where stats.user_id = totals.user_id;
    end if;
  end if;
end
$$;

-- Desafios diários: o catálogo é determinístico por data no app; esta tabela guarda apenas
-- o progresso do usuário e permite que cada bônus de dificuldade seja pago uma única vez.
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
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_daily_challenge_progress'
      and policyname = 'daily_challenge_progress_insert_own'
  ) then
    create policy daily_challenge_progress_insert_own
      on public.user_daily_challenge_progress for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_daily_challenge_progress'
      and policyname = 'daily_challenge_progress_update_own'
  ) then
    create policy daily_challenge_progress_update_own
      on public.user_daily_challenge_progress for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

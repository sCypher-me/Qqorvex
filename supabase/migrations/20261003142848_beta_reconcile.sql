-- Reconciliação do banco para o beta.
--
-- 1) Registra no histórico oito mudanças que foram aplicadas por fora dele (editor SQL) — todas
--    idempotentes; no banco atual são no-ops, exceto duas que nunca tinham rodado: a coluna
--    recurring_events.time_zone (o fuso escolhido em eventos recorrentes) e a normalização
--    `(select auth.uid())` das políticas de RLS (o Postgres avalia uma vez por consulta, não por
--    linha).
-- 2) Índices/chave primária que faltavam, uma política de leitura só em profiles, PIN verificado
--    apenas pelo desbloqueio do Cofre e nenhum acesso direto a tabelas sem login.
-- 3) Gamificação no servidor: XP e contadores só mudam por funções atômicas.

-- ── origem: 20260922000001_gamificacao_conquistas.sql ──
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


-- ── origem: 20260922000002_tarefas_recorrentes_ocorrencias.sql ──
-- Tarefas recorrentes: cada ocorrência vira uma tarefa comum identificável.
-- A chave (recorrência, data) permite sincronização segura entre o Kanban e o cron.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'task_recurrence_frequency'
  ) then
    execute 'create type public.task_recurrence_frequency as enum (''diaria'', ''semanal'', ''mensal'')';
  end if;
end $$;

create table if not exists public.recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  description text,
  priority public.task_priority not null default 'sem_prioridade',
  frequency public.task_recurrence_frequency not null,
  start_date date not null,
  next_occurrence_date date not null,
  status public.recurring_status not null default 'ativa',
  created_at timestamptz not null default now()
);

create index if not exists recurring_tasks_user_next_occurrence_idx
  on public.recurring_tasks (user_id, status, next_occurrence_date);

alter table public.recurring_tasks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'recurring_tasks' and policyname = 'recurring_tasks_select_own'
  ) then
    create policy "recurring_tasks_select_own" on public.recurring_tasks
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'recurring_tasks' and policyname = 'recurring_tasks_insert_own'
  ) then
    create policy "recurring_tasks_insert_own" on public.recurring_tasks
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'recurring_tasks' and policyname = 'recurring_tasks_update_own'
  ) then
    create policy "recurring_tasks_update_own" on public.recurring_tasks
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

alter table public.tasks
  add column if not exists recurring_task_id uuid references public.recurring_tasks (id) on delete set null,
  add column if not exists recurrence_date date;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_recurring_occurrence_unique'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_recurring_occurrence_unique unique (recurring_task_id, recurrence_date);
  end if;
end $$;

create index if not exists tasks_recurring_task_id_idx on public.tasks (recurring_task_id);


-- ── origem: 20260923000001_profile_showcase.sql ──
-- Preferências de identidade exibidas no perfil compacto da tela Hoje.
alter table public.profiles
  add column if not exists selected_title text,
  add column if not exists selected_badge_keys text[] not null default '{}';

alter table public.profiles
  drop constraint if exists profiles_selected_badges_max;

alter table public.profiles
  add constraint profiles_selected_badges_max
  check (cardinality(selected_badge_keys) <= 3);


-- ── origem: 20260923000002_vip_owner_profile_showcase.sql ──
-- Status administrativo VIP e campos de exibição do perfil.
-- VIP não é emitido por código de resgate; é uma concessão administrativa.
alter table public.profiles
  drop constraint if exists profiles_account_tier_check;

alter table public.profiles
  add constraint profiles_account_tier_check
  check (account_tier = any (array['padrao'::text, 'parceiro'::text, 'lifetime'::text, 'vip'::text]));

alter table public.profiles
  add column if not exists selected_title text,
  add column if not exists selected_badge_keys text[] not null default '{}';

alter table public.profiles
  drop constraint if exists profiles_selected_badges_max;

alter table public.profiles
  add constraint profiles_selected_badges_max
  check (cardinality(selected_badge_keys) <= 3);


-- ── origem: 20260923000003_security_hardening.sql ──
-- Mantém os segredos do servidor fora do Data API.
-- As Edge Functions usam service_role e continuam acessando a tabela; clientes
-- anon/authenticated recebem uma negação explícita, além do RLS padrão-deny.
alter table public.app_secrets enable row level security;

drop policy if exists "app_secrets_deny_client_access" on public.app_secrets;

create policy "app_secrets_deny_client_access"
  on public.app_secrets
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.app_secrets from anon, authenticated;


-- ── origem: 20260929032900_security_audit_log_retention.sql ──
-- Mantém os eventos de auditoria do Auth por até 90 dias, conforme a política
-- exibida na Central de Segurança. O cron extension já é habilitado no projeto.
do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'qqorvex-auth-audit-retention-90d';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end;
$$;

select cron.schedule(
  'qqorvex-auth-audit-retention-90d',
  '20 3 * * *',
  $$delete from auth.audit_log_entries where created_at < now() - interval '90 days';$$
);


-- ── origem: 20260927000001_recurring_event_time_zones.sql ──
-- Keep the wall-clock time selected by each user stable when the scheduled worker
-- creates the next event. Existing Brazilian records keep the app's original locale.
alter table if exists public.recurring_events
  add column if not exists time_zone text not null default 'America/Sao_Paulo';


-- ── origem: 20260923000004_rls_auth_uid_initplan.sql ──
-- Evita que auth.uid() seja reavaliado para cada linha da tabela.
-- O bloco é idempotente: policies já normalizadas pelo PostgreSQL não são reescritas.
do $$
declare
  p record;
  normalized_qual text;
  normalized_with_check text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') like '%auth.uid()%'
        or coalesce(with_check, '') like '%auth.uid()%'
      )
  loop
    if p.qual is not null and p.qual !~* 'select[[:space:]]+auth\.uid\(\)' then
      normalized_qual := replace(p.qual, 'auth.uid()', '(select auth.uid())');
      execute format(
        'alter policy %I on %I.%I using (%s)',
        p.policyname, p.schemaname, p.tablename, normalized_qual
      );
    end if;

    if p.with_check is not null and p.with_check !~* 'select[[:space:]]+auth\.uid\(\)' then
      normalized_with_check := replace(p.with_check, 'auth.uid()', '(select auth.uid())');
      execute format(
        'alter policy %I on %I.%I with check (%s)',
        p.policyname, p.schemaname, p.tablename, normalized_with_check
      );
    end if;
  end loop;
end
$$;


-- ── Índices e chave primária que faltavam (advisor) ─────────────────────────────────────────
create index if not exists partner_campaigns_created_by_idx on public.partner_campaigns (created_by);
create index if not exists profiles_partner_campaign_id_idx on public.profiles (partner_campaign_id);
alter table app_private.code_redemption_attempts
  add column if not exists id bigint generated always as identity primary key;

-- ── profiles: uma política de leitura só (dono da linha ou Dono do app) ────────────────────
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_owner on public.profiles;
create policy profiles_select_own_or_owner on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or (select public.is_owner()));

-- ── PIN: só o desbloqueio do Cofre (com limite de tentativas) verifica o PIN ───────────────
revoke execute on function public.verify_security_pin(text) from authenticated;

-- ── Sem login não há leitura nem escrita direta em tabelas de dados (o RLS já barrava; esta é
-- a segunda camada). Vale também para tabelas criadas no futuro.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- ── Gamificação no servidor ─────────────────────────────────────────────────────────────────
-- XP e contadores só mudam por estas funções: incremento atômico (nada se perde com duas ações
-- ao mesmo tempo) e valores definidos aqui, não pelo cliente. Um lock por usuário serializa as
-- chamadas da mesma conta.
create or replace function public.gamification_record_action(p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  xp_gain integer;
begin
  if current_user_id is null then
    raise exception 'Entre na sua conta.';
  end if;
  xp_gain := case p_action
    when 'task_completed' then 10
    when 'habit_or_goal_checkin' then 5
    when 'quiz_completed' then 20
    when 'library_item_completed' then 15
  end;
  if xp_gain is null then
    raise exception 'Ação de gamificação inválida.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text || ':gamification', 0));
  insert into public.gamification_stats as s
    (user_id, xp, tasks_completed, habit_or_goal_checkins, quizzes_completed, library_items_completed)
  values (
    current_user_id,
    xp_gain,
    (p_action = 'task_completed')::integer,
    (p_action = 'habit_or_goal_checkin')::integer,
    (p_action = 'quiz_completed')::integer,
    (p_action = 'library_item_completed')::integer
  )
  on conflict (user_id) do update set
    xp = s.xp + excluded.xp,
    tasks_completed = s.tasks_completed + excluded.tasks_completed,
    habit_or_goal_checkins = s.habit_or_goal_checkins + excluded.habit_or_goal_checkins,
    quizzes_completed = s.quizzes_completed + excluded.quizzes_completed,
    library_items_completed = s.library_items_completed + excluded.library_items_completed,
    updated_at = now();
end;
$$;

-- Marcos sem XP próprio: dia de check-in concluído e quiz com 90%+.
create or replace function public.gamification_record_milestone(p_milestone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Entre na sua conta.';
  end if;
  if p_milestone not in ('checkin_day', 'quiz_90_plus') then
    raise exception 'Marco de gamificação inválido.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text || ':gamification', 0));
  insert into public.gamification_stats as s (user_id, checkin_days_completed, quizzes_90_plus)
  values (current_user_id, (p_milestone = 'checkin_day')::integer, (p_milestone = 'quiz_90_plus')::integer)
  on conflict (user_id) do update set
    checkin_days_completed = s.checkin_days_completed + excluded.checkin_days_completed,
    quizzes_90_plus = s.quizzes_90_plus + excluded.quizzes_90_plus,
    updated_at = now();
end;
$$;

-- Um passo de um desafio do dia. O catálogo (determinístico por data) vive no app; aqui ficam os
-- limites que impedem abuso: data perto de hoje, meta pequena, recompensa de uma faixa conhecida
-- e bônus concedido uma única vez por desafio. Devolve true quando este passo concluiu o desafio.
create or replace function public.gamification_progress_daily_challenge(
  p_challenge_date date,
  p_challenge_key text,
  p_target integer,
  p_reward_xp integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  today date := (now() at time zone 'America/Sao_Paulo')::date;
  previous_progress integer;
  previous_completed timestamptz;
  next_progress integer;
  completed boolean;
begin
  if current_user_id is null then
    raise exception 'Entre na sua conta.';
  end if;
  if p_challenge_date not between today - 1 and today + 1
    or p_challenge_key !~ '^[a-z0-9-]{1,40}$'
    or p_target not between 1 and 10
    or p_reward_xp not in (10, 25, 50, 100) then
    raise exception 'Desafio diário inválido.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text || ':gamification', 0));
  select progress, completed_at into previous_progress, previous_completed
  from public.user_daily_challenge_progress
  where user_id = current_user_id and challenge_date = p_challenge_date and challenge_key = p_challenge_key;
  if previous_completed is not null then
    return false;
  end if;

  next_progress := least(p_target, coalesce(previous_progress, 0) + 1);
  completed := next_progress >= p_target;
  insert into public.user_daily_challenge_progress (user_id, challenge_date, challenge_key, progress, completed_at)
  values (current_user_id, p_challenge_date, p_challenge_key, next_progress, case when completed then now() end)
  on conflict (user_id, challenge_date, challenge_key) do update set
    progress = excluded.progress,
    completed_at = excluded.completed_at,
    updated_at = now();

  if completed then
    insert into public.gamification_stats as s (user_id, xp)
    values (current_user_id, p_reward_xp)
    on conflict (user_id) do update set xp = s.xp + excluded.xp, updated_at = now();
  end if;
  return completed;
end;
$$;

revoke all on function public.gamification_record_action(text) from public, anon;
revoke all on function public.gamification_record_milestone(text) from public, anon;
revoke all on function public.gamification_progress_daily_challenge(date, text, integer, integer) from public, anon;
grant execute on function public.gamification_record_action(text) to authenticated;
grant execute on function public.gamification_record_milestone(text) to authenticated;
grant execute on function public.gamification_progress_daily_challenge(date, text, integer, integer) to authenticated;

-- O cliente passa a só ler XP e desafios.
revoke insert, update, delete on public.gamification_stats from authenticated;
revoke insert, update, delete on public.user_daily_challenge_progress from authenticated;
drop policy if exists "insert own gamification stats" on public.gamification_stats;
drop policy if exists "update own gamification stats" on public.gamification_stats;
drop policy if exists daily_challenge_progress_insert_own on public.user_daily_challenge_progress;
drop policy if exists daily_challenge_progress_update_own on public.user_daily_challenge_progress;

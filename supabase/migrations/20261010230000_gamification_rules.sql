-- Regras da Gamificação (backlog §6):
--   1. Consistência acumulada no lugar de sequências que zeram: get_my_habit_totals() conta quantas
--      vezes cada hábito já foi feito (o número só cresce).
--   2. Desafios do dia opcionais, sugeridos pelo que a pessoa usa e trocáveis sem punição: as
--      escolhas do dia ficam em user_daily_challenge_choices; a sugestão pula ações que a pessoa não
--      tem como fazer (sem hábito/meta ativa, sem item aberto na Biblioteca, sem Quiz); a troca só vale
--      para desafio ainda não concluído (assim trocar não rende XP extra). Uma ação avança todos os
--      desafios do dia que combinam com ela. O XP continua sendo concedido só pelos gatilhos.
--   3. Concessão administrativa com origem e auditoria: user_badges.grant_source/granted_by e
--      app_private.gamification_admin_audit para insígnias e títulos dados pelo Dono.

-- ───────────────────────── 1. Consistência acumulada dos hábitos ─────────────────────────

create or replace function public.get_my_habit_totals()
returns table (habit_id uuid, total integer, since date)
language sql
stable
security invoker
set search_path = ''
as $$
  select l.habit_id, count(*)::integer, min(l.log_date)
  from public.habit_logs l
  where l.state = 'concluido'
  group by l.habit_id;
$$;

revoke all on function public.get_my_habit_totals() from public, anon;
grant execute on function public.get_my_habit_totals() to authenticated;

-- ───────────────────────── 2. Desafios do dia por pessoa ─────────────────────────

-- Catálogo fixo (mesmas chaves, metas e XP de modules/pessoal/gamificacao/src/dailyChallenges.ts).
-- sort_order é a posição na rotação de gamification_daily_challenges().
create or replace function app_private.gamification_challenge_catalog()
returns table (challenge_key text, difficulty text, action text, target integer, reward_xp integer, sort_order integer)
language sql
immutable
set search_path = ''
as $$
  values
    ('task-1', 'Fácil', 'task_completed', 1, 10, 1),
    ('checkin-1', 'Fácil', 'habit_or_goal_checkin', 1, 10, 2),
    ('library-1', 'Fácil', 'library_item_completed', 1, 10, 3),
    ('study-1', 'Fácil', 'quiz_completed', 1, 10, 4),
    ('task-3', 'Médio', 'task_completed', 3, 25, 1),
    ('library-2', 'Médio', 'library_item_completed', 2, 25, 2),
    ('checkin-2', 'Médio', 'habit_or_goal_checkin', 2, 25, 3),
    ('study-2', 'Médio', 'quiz_completed', 2, 25, 4),
    ('task-5', 'Difícil', 'task_completed', 5, 50, 1),
    ('library-3', 'Difícil', 'library_item_completed', 3, 50, 2),
    ('study-3', 'Difícil', 'quiz_completed', 3, 50, 3),
    ('checkin-3', 'Difícil', 'habit_or_goal_checkin', 3, 50, 4)
$$;

create table public.user_daily_challenge_choices (
  user_id uuid not null references auth.users (id) on delete cascade,
  challenge_date date not null,
  -- 0 e 1: Fácil; 2: Médio; 3: Difícil.
  slot smallint not null check (slot between 0 and 3),
  challenge_key text not null,
  swaps smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, challenge_date, slot),
  unique (user_id, challenge_date, challenge_key)
);

alter table public.user_daily_challenge_choices enable row level security;
revoke all on table public.user_daily_challenge_choices from public, anon, authenticated;
grant select on table public.user_daily_challenge_choices to authenticated;
create policy user_daily_challenge_choices_select_own
  on public.user_daily_challenge_choices
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Ações que a pessoa consegue fazer hoje com o que já tem no app.
create or replace function app_private.gamification_available_actions(p_user_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_remove(array[
    'task_completed',
    case when exists (select 1 from public.habits h where h.user_id = p_user_id and h.status = 'ativo')
           or exists (select 1 from public.goals g where g.user_id = p_user_id and g.status = 'ativa')
         then 'habit_or_goal_checkin' end,
    case when exists (select 1 from public.library_items l where l.user_id = p_user_id and l.status in ('quero_consumir', 'em_andamento', 'pausado'))
         then 'library_item_completed' end,
    case when exists (select 1 from public.assessments a join public.notebooks n on n.id = a.notebook_id where n.user_id = p_user_id)
         then 'quiz_completed' end
  ], null);
$$;

-- Cria as escolhas do dia (uma vez): primeiro o que a pessoa consegue fazer com o que tem no app,
-- depois variedade de ações, depois a mesma rotação global de antes.
create or replace function app_private.gamification_ensure_daily_choices(p_user_id uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_available text[];
  v_used_actions text[] := array[]::text[];
  v_used_keys text[] := array[]::text[];
  v_slot integer;
  v_difficulty text;
  v_start integer;
  v_pick record;
begin
  if p_user_id is null or p_date is null then
    return;
  end if;
  if exists (select 1 from public.user_daily_challenge_choices c where c.user_id = p_user_id and c.challenge_date = p_date) then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':gamification', 0));
  if exists (select 1 from public.user_daily_challenge_choices c where c.user_id = p_user_id and c.challenge_date = p_date) then
    return;
  end if;

  v_available := app_private.gamification_available_actions(p_user_id);
  for v_slot in 0..3 loop
    v_difficulty := case when v_slot < 2 then 'Fácil' when v_slot = 2 then 'Médio' else 'Difícil' end;
    v_start := mod(
      app_private.gamification_hash(to_char(p_date, 'YYYY-MM-DD') || ':' || v_difficulty) + case when v_slot = 1 then 1 else 0 end,
      4
    )::integer;

    select cat.challenge_key, cat.action
      into v_pick
      from app_private.gamification_challenge_catalog() cat
     where cat.difficulty = v_difficulty
       and not (cat.challenge_key = any(v_used_keys))
     order by not (cat.action = any(v_available)),
              (cat.action = any(v_used_actions)),
              mod(cat.sort_order - 1 - v_start + 4, 4)
     limit 1;

    insert into public.user_daily_challenge_choices (user_id, challenge_date, slot, challenge_key)
    values (p_user_id, p_date, v_slot, v_pick.challenge_key)
    on conflict do nothing;

    v_used_actions := array_append(v_used_actions, v_pick.action);
    v_used_keys := array_append(v_used_keys, v_pick.challenge_key);
  end loop;
end;
$$;

revoke all on function app_private.gamification_challenge_catalog() from public, anon, authenticated;
revoke all on function app_private.gamification_available_actions(uuid) from public, anon, authenticated;
revoke all on function app_private.gamification_ensure_daily_choices(uuid, date) from public, anon, authenticated;

-- Quem já tinha progresso hoje mantém exatamente os desafios que estava vendo (rotação global).
insert into public.user_daily_challenge_choices (user_id, challenge_date, slot, challenge_key)
select users.user_id, users.challenge_date, (picked.ordinality - 1)::smallint, picked.challenge_key
from (
  select distinct p.user_id, p.challenge_date
  from public.user_daily_challenge_progress p
  where p.challenge_date = (now() at time zone 'America/Sao_Paulo')::date
) users
cross join lateral app_private.gamification_daily_challenges(users.challenge_date) with ordinality as picked (challenge_key, action, target, reward_xp, ordinality)
on conflict do nothing;

create or replace function public.get_my_daily_challenges(p_date date default null)
returns table (
  slot smallint,
  challenge_key text,
  difficulty text,
  action text,
  target integer,
  reward_xp integer,
  progress integer,
  completed_at timestamptz,
  swaps smallint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_date date := coalesce(p_date, (now() at time zone 'America/Sao_Paulo')::date);
begin
  if v_user is null then
    raise exception 'Entre na sua conta para ver os desafios.';
  end if;
  if v_date > v_today then
    raise exception 'Os desafios desse dia ainda não existem.';
  end if;
  -- Só o dia de hoje é sugerido na hora; dias passados mostram o que foi escolhido (ou nada).
  if v_date = v_today then
    perform app_private.gamification_ensure_daily_choices(v_user, v_date);
  end if;

  return query
  select ch.slot, ch.challenge_key, cat.difficulty, cat.action, cat.target, cat.reward_xp,
         coalesce(p.progress, 0), p.completed_at, ch.swaps
  from public.user_daily_challenge_choices ch
  join app_private.gamification_challenge_catalog() cat on cat.challenge_key = ch.challenge_key
  left join public.user_daily_challenge_progress p
    on p.user_id = ch.user_id and p.challenge_date = ch.challenge_date and p.challenge_key = ch.challenge_key
  where ch.user_id = v_user and ch.challenge_date = v_date
  order by ch.slot;
end;
$$;

revoke all on function public.get_my_daily_challenges(date) from public, anon;
grant execute on function public.get_my_daily_challenges(date) to authenticated;

-- Troca o desafio de uma posição por outro do mesmo nível. Desafio concluído não troca (senão
-- trocar renderia XP extra); a troca nunca tira XP nem progresso já registrado.
create or replace function public.swap_my_daily_challenge(p_slot integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_current text;
  v_difficulty text;
  v_current_sort integer;
  v_available text[];
  v_other_actions text[];
  v_taken_keys text[];
  v_next text;
begin
  if v_user is null then
    raise exception 'Entre na sua conta para trocar um desafio.';
  end if;
  if p_slot is null or p_slot not between 0 and 3 then
    raise exception 'Desafio inválido.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':gamification', 0));
  perform app_private.gamification_ensure_daily_choices(v_user, v_today);

  select ch.challenge_key into v_current
    from public.user_daily_challenge_choices ch
   where ch.user_id = v_user and ch.challenge_date = v_today and ch.slot = p_slot;

  if exists (
    select 1 from public.user_daily_challenge_progress p
    where p.user_id = v_user and p.challenge_date = v_today and p.challenge_key = v_current and p.completed_at is not null
  ) then
    raise exception 'Este desafio já foi concluído hoje.';
  end if;

  select cat.difficulty, cat.sort_order into v_difficulty, v_current_sort
    from app_private.gamification_challenge_catalog() cat
   where cat.challenge_key = v_current;

  select coalesce(array_agg(cat.action) filter (where ch.slot <> p_slot), array[]::text[]),
         coalesce(array_agg(ch.challenge_key), array[]::text[])
    into v_other_actions, v_taken_keys
    from public.user_daily_challenge_choices ch
    join app_private.gamification_challenge_catalog() cat on cat.challenge_key = ch.challenge_key
   where ch.user_id = v_user and ch.challenge_date = v_today;

  v_available := app_private.gamification_available_actions(v_user);

  -- Prefere o que a pessoa consegue fazer e uma ação diferente das outras posições (variedade);
  -- repetir ação é permitido, pois cada ação avança todos os desafios que combinam com ela.
  select cat.challenge_key into v_next
    from app_private.gamification_challenge_catalog() cat
   where cat.difficulty = v_difficulty
     and not (cat.challenge_key = any(v_taken_keys))
   order by not (cat.action = any(v_available)),
            (cat.action = any(v_other_actions)),
            mod(cat.sort_order - v_current_sort + 4, 4)
   limit 1;

  if v_next is null then
    raise exception 'Não há outro desafio desse nível para trocar hoje.';
  end if;

  update public.user_daily_challenge_choices
     set challenge_key = v_next, swaps = swaps + 1, updated_at = now()
   where user_id = v_user and challenge_date = v_today and slot = p_slot;
  return v_next;
end;
$$;

revoke all on function public.swap_my_daily_challenge(integer) from public, anon;
grant execute on function public.swap_my_daily_challenge(integer) to authenticated;

-- XP de ação continua igual; o progresso de desafio passa a seguir as escolhas da pessoa.
create or replace function app_private.gamification_record_action(p_user_id uuid, p_action text, p_source_id uuid, p_action_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_xp integer;
  v_challenge record;
  v_previous_progress integer;
  v_previous_completed timestamptz;
  v_next_progress integer;
  v_completed boolean;
begin
  if auth.uid() is distinct from p_user_id then
    return;
  end if;

  v_xp := case p_action
    when 'task_completed' then 10
    when 'habit_or_goal_checkin' then 5
    when 'quiz_completed' then 20
    when 'library_item_completed' then 15
    else null
  end;
  if v_xp is null or p_source_id is null or p_action_date is null then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':gamification', 0));
  insert into app_private.gamification_action_events(user_id, action, source_id, action_date)
  values (p_user_id, p_action, p_source_id, p_action_date)
  on conflict do nothing;
  if not found then
    return;
  end if;

  insert into public.gamification_stats as s
    (user_id, xp, tasks_completed, habit_or_goal_checkins, quizzes_completed, library_items_completed)
  values (
    p_user_id,
    v_xp,
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

  -- Uma ação avança todos os desafios do dia que combinam com ela (ex.: "1 tarefa" e "3 tarefas").
  perform app_private.gamification_ensure_daily_choices(p_user_id, p_action_date);
  for v_challenge in
    select cat.challenge_key, cat.target, cat.reward_xp
      from public.user_daily_challenge_choices ch
      join app_private.gamification_challenge_catalog() cat on cat.challenge_key = ch.challenge_key
     where ch.user_id = p_user_id and ch.challenge_date = p_action_date and cat.action = p_action
     order by ch.slot
  loop
    select p.progress, p.completed_at
      into v_previous_progress, v_previous_completed
      from public.user_daily_challenge_progress p
     where p.user_id = p_user_id
       and p.challenge_date = p_action_date
       and p.challenge_key = v_challenge.challenge_key;
    if v_previous_completed is not null then
      continue;
    end if;

    insert into app_private.gamification_challenge_events(user_id, challenge_date, challenge_key, source_id)
    values (p_user_id, p_action_date, v_challenge.challenge_key, p_source_id)
    on conflict do nothing;
    if not found then
      continue;
    end if;

    v_next_progress := least(v_challenge.target, coalesce(v_previous_progress, 0) + 1);
    v_completed := v_next_progress >= v_challenge.target;
    insert into public.user_daily_challenge_progress
      (user_id, challenge_date, challenge_key, progress, completed_at)
    values (
      p_user_id,
      p_action_date,
      v_challenge.challenge_key,
      v_next_progress,
      case when v_completed then now() end
    )
    on conflict (user_id, challenge_date, challenge_key) do update set
      progress = excluded.progress,
      completed_at = excluded.completed_at,
      updated_at = now();

    if v_completed then
      insert into public.gamification_stats as s (user_id, xp)
      values (p_user_id, v_challenge.reward_xp)
      on conflict (user_id) do update set xp = s.xp + excluded.xp, updated_at = now();
    end if;
  end loop;
end;
$$;

-- ───────────────────────── 3. Origem e auditoria das concessões ─────────────────────────

alter table public.user_badges
  add column grant_source text not null default 'automatico' check (grant_source in ('automatico', 'dono')),
  add column granted_by uuid references auth.users (id) on delete set null;

create table app_private.gamification_admin_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  target_user_id uuid references auth.users (id) on delete cascade,
  action text not null check (action in ('grant_badge', 'set_title')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index gamification_admin_audit_target_idx on app_private.gamification_admin_audit (target_user_id, created_at desc);
alter table app_private.gamification_admin_audit enable row level security;
revoke all on table app_private.gamification_admin_audit from public, anon, authenticated;

create or replace function public.owner_grant_gamification_badge(p_user_id uuid, p_badge_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  inserted_rows integer;
begin
  if current_user_id is null then
    raise exception 'Entre na conta do Dono para conceder uma insígnia.';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = current_user_id and p.role = 'dono'
  ) then
    raise exception 'Somente a conta do Dono pode conceder insígnias.';
  end if;

  if p_user_id is null or not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'A conta escolhida não existe.';
  end if;

  if p_badge_key is null or p_badge_key not in (
    '150_tarefas', '30_checkin_days', '50_quizzes_90_plus', '50_biblioteca',
    'amigo_lifetime', 'beta_tester', 'dono', 'vip_plus', 'assinante_anual'
  ) then
    raise exception 'Esta insígnia é automática ou não pertence ao catálogo concedível.';
  end if;

  insert into public.user_badges (user_id, badge_key, grant_source, granted_by)
  values (p_user_id, p_badge_key, 'dono', current_user_id)
  on conflict (user_id, badge_key) do nothing;
  get diagnostics inserted_rows = row_count;

  insert into app_private.gamification_admin_audit (actor_id, target_user_id, action, detail)
  values (current_user_id, p_user_id, 'grant_badge', jsonb_build_object('badge_key', p_badge_key, 'already_had', inserted_rows = 0));

  return inserted_rows > 0;
end;
$$;

create or replace function public.owner_set_account_title(p_user_id uuid, p_title text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_title text := nullif(trim(p_title), '');
  previous_title text;
begin
  if not public.is_owner() then raise exception 'Só o Dono pode alterar títulos.'; end if;
  if p_user_id is null then raise exception 'Conta inválida.'; end if;
  if clean_title is not null and char_length(clean_title) > 40 then raise exception 'O título pode ter até 40 caracteres.'; end if;
  select selected_title into previous_title from public.profiles where id = p_user_id;
  update public.profiles set selected_title = clean_title where id = p_user_id;
  if not found then raise exception 'Conta não encontrada.'; end if;

  insert into app_private.gamification_admin_audit (actor_id, target_user_id, action, detail)
  values (auth.uid(), p_user_id, 'set_title', jsonb_build_object('title', clean_title, 'previous_title', previous_title));
end;
$$;

-- Histórico das concessões, para a Central do Dono.
create or replace function public.owner_list_gamification_audit(p_limit integer default 50)
returns table (
  id bigint,
  created_at timestamptz,
  action text,
  detail jsonb,
  target_user_id uuid,
  target_name text,
  actor_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_owner() then
    raise exception 'Só o Dono pode ver o histórico de concessões.';
  end if;
  return query
  select a.id, a.created_at, a.action, a.detail, a.target_user_id,
         coalesce(target.display_name, target.username::text, 'Conta removida'),
         coalesce(actor.display_name, actor.username::text, 'Dono')
  from app_private.gamification_admin_audit a
  left join public.profiles target on target.id = a.target_user_id
  left join public.profiles actor on actor.id = a.actor_id
  order by a.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

revoke all on function public.owner_list_gamification_audit(integer) from public, anon;
grant execute on function public.owner_list_gamification_audit(integer) to authenticated;

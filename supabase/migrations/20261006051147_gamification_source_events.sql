-- Award XP only from persisted source events, never from a client supplied action/amount.
-- The private ledger makes every source transition idempotent and keeps write access away from
-- authenticated clients. All event dates use the app's canonical America/Sao_Paulo day.

create table app_private.gamification_action_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in (
    'task_completed', 'habit_or_goal_checkin', 'quiz_completed', 'library_item_completed'
  )),
  source_id uuid not null,
  action_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, action, source_id)
);

create table app_private.gamification_milestone_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  milestone text not null check (milestone in ('checkin_day', 'quiz_90_plus')),
  source_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, milestone, source_id)
);

create table app_private.gamification_challenge_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_date date not null,
  challenge_key text not null,
  source_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, challenge_date, challenge_key, source_id)
);

alter table app_private.gamification_action_events enable row level security;
alter table app_private.gamification_milestone_events enable row level security;
alter table app_private.gamification_challenge_events enable row level security;
revoke all on app_private.gamification_action_events from public, anon, authenticated;
revoke all on app_private.gamification_milestone_events from public, anon, authenticated;
revoke all on app_private.gamification_challenge_events from public, anon, authenticated;

create or replace function app_private.gamification_hash(p_value text)
returns bigint
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_hash bigint := 7;
  v_index integer;
begin
  for v_index in 1..char_length(p_value) loop
    v_hash := mod(v_hash * 31 + ascii(substr(p_value, v_index, 1)), 4294967296);
  end loop;
  return v_hash;
end;
$$;

-- This is the server-side equivalent of getDailyChallenges() in dailyChallenges.ts. Keeping
-- the deterministic schedule here prevents callers from selecting an easier hidden challenge.
create or replace function app_private.gamification_daily_challenges(p_date date)
returns table(challenge_key text, action text, target integer, reward_xp integer)
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_difficulty text;
  v_keys text[];
  v_actions text[];
  v_targets integer[];
  v_reward integer;
  v_slots integer;
  v_used_actions text[] := array[]::text[];
  v_hash bigint;
  v_start integer;
  v_candidate integer;
  v_slot integer;
  v_offset integer;
begin
  for v_difficulty in select unnest(array['Fácil', 'Médio', 'Difícil']::text[]) loop
    if v_difficulty = 'Fácil' then
      v_keys := array['task-1', 'checkin-1', 'library-1', 'study-1'];
      v_actions := array['task_completed', 'habit_or_goal_checkin', 'library_item_completed', 'quiz_completed'];
      v_targets := array[1, 1, 1, 1];
      v_reward := 10;
      v_slots := 2;
    elsif v_difficulty = 'Médio' then
      v_keys := array['task-3', 'library-2', 'checkin-2', 'study-2'];
      v_actions := array['task_completed', 'library_item_completed', 'habit_or_goal_checkin', 'quiz_completed'];
      v_targets := array[3, 2, 2, 2];
      v_reward := 25;
      v_slots := 1;
    else
      v_keys := array['task-5', 'library-3', 'study-3', 'checkin-3'];
      v_actions := array['task_completed', 'library_item_completed', 'quiz_completed', 'habit_or_goal_checkin'];
      v_targets := array[5, 3, 3, 3];
      v_reward := 50;
      v_slots := 1;
    end if;

    v_hash := app_private.gamification_hash(
      to_char(p_date, 'YYYY-MM-DD') || ':' || v_difficulty
    );
    for v_slot in 0..v_slots - 1 loop
      v_start := mod(v_hash + v_slot, cardinality(v_keys))::integer;
      for v_offset in 0..cardinality(v_keys) - 1 loop
        v_candidate := mod(v_start + v_offset, cardinality(v_keys)) + 1;
        if not (v_actions[v_candidate] = any(v_used_actions)) then
          challenge_key := v_keys[v_candidate];
          action := v_actions[v_candidate];
          target := v_targets[v_candidate];
          reward_xp := v_reward;
          v_used_actions := array_append(v_used_actions, action);
          return next;
          exit;
        end if;
      end loop;
    end loop;
  end loop;
end;
$$;

create or replace function app_private.gamification_record_action(
  p_user_id uuid,
  p_action text,
  p_source_id uuid,
  p_action_date date
)
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

  select c.challenge_key, c.target, c.reward_xp
    into v_challenge
    from app_private.gamification_daily_challenges(p_action_date) c
   where c.action = p_action;
  if not found then
    return;
  end if;

  select p.progress, p.completed_at
    into v_previous_progress, v_previous_completed
    from public.user_daily_challenge_progress p
   where p.user_id = p_user_id
     and p.challenge_date = p_action_date
     and p.challenge_key = v_challenge.challenge_key;
  if v_previous_completed is not null then
    return;
  end if;

  insert into app_private.gamification_challenge_events(user_id, challenge_date, challenge_key, source_id)
  values (p_user_id, p_action_date, v_challenge.challenge_key, p_source_id)
  on conflict do nothing;
  if not found then
    return;
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
end;
$$;

create or replace function app_private.gamification_record_milestone(
  p_user_id uuid,
  p_milestone text,
  p_source_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is distinct from p_user_id or p_source_id is null then
    return;
  end if;
  if p_milestone not in ('checkin_day', 'quiz_90_plus') then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':gamification', 0));
  insert into app_private.gamification_milestone_events(user_id, milestone, source_id)
  values (p_user_id, p_milestone, p_source_id)
  on conflict do nothing;
  if not found then
    return;
  end if;

  insert into public.gamification_stats as s (user_id, checkin_days_completed, quizzes_90_plus)
  values (
    p_user_id,
    (p_milestone = 'checkin_day')::integer,
    (p_milestone = 'quiz_90_plus')::integer
  )
  on conflict (user_id) do update set
    checkin_days_completed = s.checkin_days_completed + excluded.checkin_days_completed,
    quizzes_90_plus = s.quizzes_90_plus + excluded.quizzes_90_plus,
    updated_at = now();
end;
$$;

create or replace function app_private.gamification_source_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_source_id uuid;
  v_action text;
  v_action_date date := (clock_timestamp() at time zone 'America/Sao_Paulo')::date;
begin
  if tg_table_name = 'tasks' then
    if tg_op <> 'UPDATE' or old.status::text = 'concluido' or new.status::text <> 'concluido' then
      return new;
    end if;
    v_user_id := new.user_id;
    v_source_id := new.id;
    v_action := 'task_completed';
  elsif tg_table_name = 'goal_checkins' then
    select g.user_id into v_user_id from public.goals g where g.id = new.goal_id;
    v_source_id := new.id;
    v_action := 'habit_or_goal_checkin';
  elsif tg_table_name = 'habit_logs' then
    if new.state::text <> 'concluido' or (tg_op = 'UPDATE' and old.state::text = 'concluido') then
      return new;
    end if;
    select h.user_id into v_user_id from public.habits h where h.id = new.habit_id;
    v_source_id := new.id;
    v_action := 'habit_or_goal_checkin';
  elsif tg_table_name = 'library_items' then
    if tg_op <> 'UPDATE' or old.status::text = 'concluido' or new.status::text <> 'concluido' then
      return new;
    end if;
    v_user_id := new.user_id;
    v_source_id := new.id;
    v_action := 'library_item_completed';
  elsif tg_table_name = 'quiz_attempts' then
    v_user_id := new.user_id;
    v_source_id := new.id;
    v_action := 'quiz_completed';
  elsif tg_table_name = 'daily_checkins' then
    if tg_op <> 'INSERT' then
      return new;
    end if;
    v_user_id := new.user_id;
    v_source_id := new.id;
    perform app_private.gamification_record_milestone(v_user_id, 'checkin_day', v_source_id);
    return new;
  else
    return new;
  end if;

  if v_user_id is null or v_source_id is null then
    return new;
  end if;
  perform app_private.gamification_record_action(v_user_id, v_action, v_source_id, v_action_date);
  if tg_table_name = 'quiz_attempts' and new.score * 100 >= (
    select count(*) * 90 from public.quiz_questions q where q.quiz_id = new.quiz_id
  ) and exists (select 1 from public.quiz_questions q where q.quiz_id = new.quiz_id) then
    perform app_private.gamification_record_milestone(v_user_id, 'quiz_90_plus', v_source_id);
  end if;
  return new;
end;
$$;

create or replace function app_private.gamification_grade_quiz_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
  v_correct integer;
begin
  if not exists (
    select 1
      from public.quizzes q
      join public.notebooks n on n.id = q.notebook_id
     where q.id = new.quiz_id and n.user_id = new.user_id
  ) then
    raise exception 'A avaliação não pertence a esta conta.';
  end if;

  select count(*)::integer,
         count(*) filter (
           where q.correct_option_index = case
             when jsonb_typeof(new.answers -> q.order_index) = 'number'
              and (new.answers ->> q.order_index) ~ '^[0-9]+$'
             then (new.answers ->> q.order_index)::integer
             else null
           end
         )::integer
    into v_total, v_correct
    from public.quiz_questions q
   where q.quiz_id = new.quiz_id;
  if coalesce(v_total, 0) = 0 then
    raise exception 'A avaliação precisa ter pelo menos uma pergunta.';
  end if;
  new.score := coalesce(v_correct, 0);
  return new;
end;
$$;

revoke all on function app_private.gamification_hash(text) from public, anon, authenticated;
revoke all on function app_private.gamification_daily_challenges(date) from public, anon, authenticated;
revoke all on function app_private.gamification_record_action(uuid, text, uuid, date) from public, anon, authenticated;
revoke all on function app_private.gamification_record_milestone(uuid, text, uuid) from public, anon, authenticated;
revoke all on function app_private.gamification_source_event() from public, anon, authenticated;
revoke all on function app_private.gamification_grade_quiz_attempt() from public, anon, authenticated;

drop function if exists public.gamification_record_action(text);
drop function if exists public.gamification_record_milestone(text);
drop function if exists public.gamification_progress_daily_challenge(date, text, integer, integer);

create trigger gamification_task_completed
  after update of status on public.tasks
  for each row when (old.status is distinct from new.status and new.status = 'concluido')
  execute function app_private.gamification_source_event();

create trigger gamification_goal_checkin_created
  after insert on public.goal_checkins
  for each row execute function app_private.gamification_source_event();

create trigger gamification_habit_completed_inserted
  after insert on public.habit_logs
  for each row when (new.state = 'concluido')
  execute function app_private.gamification_source_event();

create trigger gamification_habit_completed_updated
  after update of state on public.habit_logs
  for each row when (old.state is distinct from new.state and new.state = 'concluido')
  execute function app_private.gamification_source_event();

create trigger gamification_library_item_completed
  after update of status on public.library_items
  for each row when (old.status is distinct from new.status and new.status = 'concluido')
  execute function app_private.gamification_source_event();

create trigger gamification_quiz_attempt_grade
  before insert on public.quiz_attempts
  for each row execute function app_private.gamification_grade_quiz_attempt();

create trigger gamification_quiz_attempt_completed
  after insert on public.quiz_attempts
  for each row execute function app_private.gamification_source_event();

create trigger gamification_daily_checkin_created
  after insert on public.daily_checkins
  for each row execute function app_private.gamification_source_event();

-- Keep quiz-only fields behind a PL/pgSQL branch; NEW is a generic trigger record for the
-- task/check-in/library triggers and cannot resolve fields that their tables do not have.
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

  if tg_table_name = 'quiz_attempts' then
    if new.score * 100 >= (
      select count(*) * 90 from public.quiz_questions q where q.quiz_id = new.quiz_id
    ) and exists (select 1 from public.quiz_questions q where q.quiz_id = new.quiz_id) then
      perform app_private.gamification_record_milestone(v_user_id, 'quiz_90_plus', v_source_id);
    end if;
  end if;
  return new;
end;
$$;

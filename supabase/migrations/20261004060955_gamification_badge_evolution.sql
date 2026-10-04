-- Badges progressivos mantêm somente o maior marco alcançado. Concessões manuais ficam
-- reservadas ao catálogo permanente e exigem autorização de dono validada no banco.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.user_badge_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  created_at timestamptz not null default now(),
  shown_at timestamptz
);

alter table public.user_badge_notifications enable row level security;
drop policy if exists "select own badge notifications" on public.user_badge_notifications;
create policy "select own badge notifications" on public.user_badge_notifications
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on table public.user_badge_notifications from public, anon, authenticated;
grant select on table public.user_badge_notifications to authenticated;

create or replace function private.enqueue_user_badge_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.user_badge_notifications (user_id, badge_key)
  values (new.user_id, new.badge_key);
  return new;
end;
$function$;

revoke all on function private.enqueue_user_badge_notification() from public, anon, authenticated;

create or replace function private.enqueue_level_badge_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  previous_xp integer := 0;
  previous_level integer;
  current_level integer;
begin
  if tg_op = 'UPDATE' then
    previous_xp := greatest(0, old.xp);
  end if;
  if tg_op = 'UPDATE' and new.xp <= previous_xp then
    return new;
  end if;

  previous_level := greatest(1, floor((1 + sqrt(1 + previous_xp::double precision / 12.5)) / 2)::integer);
  current_level := greatest(1, floor((1 + sqrt(1 + greatest(0, new.xp)::double precision / 12.5)) / 2)::integer);
  if current_level > previous_level and current_level <= 50 then
    insert into public.user_badge_notifications (user_id, badge_key)
    values (new.user_id, 'level:' || current_level::text);
  end if;
  return new;
end;
$function$;

revoke all on function private.enqueue_level_badge_notification() from public, anon, authenticated;

drop trigger if exists user_badges_enqueue_notification on public.user_badges;
create trigger user_badges_enqueue_notification
  after insert on public.user_badges
  for each row execute function private.enqueue_user_badge_notification();

drop trigger if exists gamification_stats_enqueue_level_badge on public.gamification_stats;
create trigger gamification_stats_enqueue_level_badge
  after insert or update of xp on public.gamification_stats
  for each row execute function private.enqueue_level_badge_notification();

do $migration$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'user_badge_notifications'
     ) then
    alter publication supabase_realtime add table public.user_badge_notifications;
  end if;
end;
$migration$;

create or replace function public.claim_my_badge_notifications()
returns table (notification_id uuid, badge_key text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Entre na sua conta para consultar novas insígnias.';
  end if;

  return query
  with pending as (
    select n.id
    from public.user_badge_notifications n
    where n.user_id = current_user_id and n.shown_at is null
    order by n.created_at, n.id
    for update skip locked
  ), claimed as (
    update public.user_badge_notifications n
    set shown_at = now()
    from pending p
    where n.id = p.id
    returning n.id, n.badge_key, n.created_at
  )
  select claimed.id, claimed.badge_key, claimed.created_at from claimed;
end;
$function$;

revoke all on function public.claim_my_badge_notifications() from public, anon;
grant execute on function public.claim_my_badge_notifications() to authenticated;

create or replace function public.owner_grant_gamification_badge(p_user_id uuid, p_badge_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
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

  insert into public.user_badges (user_id, badge_key)
  values (p_user_id, p_badge_key)
  on conflict (user_id, badge_key) do nothing;
  get diagnostics inserted_rows = row_count;
  return inserted_rows > 0;
end;
$function$;

revoke all on function public.owner_grant_gamification_badge(uuid, text) from public, anon;
grant execute on function public.owner_grant_gamification_badge(uuid, text) to authenticated;

-- Corrige os registros acumulados: no máximo o maior mês de assinatura permanece na conta e na vitrine.
with active_tenure as (
  select s.user_id,
         max(greatest(0,
           extract(year from age(now(), s.created_at))::integer * 12 +
           extract(month from age(now(), s.created_at))::integer
         ))::integer as completed_months
  from public.billing_subscriptions s
  where s.plan_key = 'plus'
    and s.status in ('active', 'trialing', 'canceled')
    and s.current_period_end > now()
  group by s.user_id
), users_with_tenure_badges as (
  select distinct b.user_id
  from public.user_badges b
  where b.badge_key ~ '^assinatura_[0-9]{2}_meses$'
), keepers as (
  select u.user_id,
         coalesce(
           case when coalesce(a.completed_months, 0) >= 1
             then 'assinatura_' || lpad(least(a.completed_months, 50)::text, 2, '0') || '_meses'
           end,
           (
             select b.badge_key
             from public.user_badges b
             where b.user_id = u.user_id and b.badge_key ~ '^assinatura_[0-9]{2}_meses$'
             order by substring(b.badge_key from '[0-9]+')::integer desc
             limit 1
           )
         ) as keep_key
  from users_with_tenure_badges u
  left join active_tenure a on a.user_id = u.user_id
), removed AS (
  delete from public.user_badges b
  using keepers k
  where b.user_id = k.user_id
    and b.badge_key ~ '^assinatura_[0-9]{2}_meses$'
    and b.badge_key is distinct from k.keep_key
  returning b.user_id
)
update public.profiles p
set selected_badge_keys = array(
  select selected.key
  from unnest(p.selected_badge_keys) as selected(key)
  where selected.key !~ '^assinatura_[0-9]{2}_meses$'
     or selected.key = k.keep_key
)
from keepers k
where p.id = k.user_id
  and exists (select 1 from removed r where r.user_id = p.id);

-- Atualiza o sincronizador sem mudar sua interface RPC já consumida pelo app.
create or replace function public.sync_my_gamification_badges()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := auth.uid();
  current_role text;
  current_tier text;
  is_beta boolean;
  task_count integer := 0;
  checkin_count integer := 0;
  quiz_count integer := 0;
  library_count integer := 0;
  plus_active boolean := false;
  annual_active boolean := false;
  completed_months integer := 0;
  latest_subscription_badge text;
  newly_unlocked integer := 0;
begin
  if current_user_id is null then
    raise exception 'Entre na sua conta para sincronizar suas insígnias.';
  end if;

  select p.role, p.account_tier, p.is_beta_tester
  into current_role, current_tier, is_beta
  from public.profiles p
  where p.id = current_user_id;

  if not found then
    raise exception 'Perfil não encontrado.';
  end if;

  select coalesce(s.tasks_completed, 0), coalesce(s.checkin_days_completed, 0),
         coalesce(s.quizzes_90_plus, 0), coalesce(s.library_items_completed, 0)
  into task_count, checkin_count, quiz_count, library_count
  from public.gamification_stats s
  where s.user_id = current_user_id;

  select
    coalesce(bool_or(s.status in ('active', 'trialing', 'canceled') and s.current_period_end > now()), false),
    coalesce(bool_or(s.billing_period = 'annual' and s.status in ('active', 'trialing', 'canceled') and s.current_period_end > now()), false),
    coalesce(max(
      case when s.status in ('active', 'trialing', 'canceled') and s.current_period_end > now()
        then greatest(0,
          extract(year from age(now(), s.created_at))::integer * 12 +
          extract(month from age(now(), s.created_at))::integer)
        else 0
      end
    ), 0)
  into plus_active, annual_active, completed_months
  from public.billing_subscriptions s
  where s.user_id = current_user_id and s.plan_key = 'plus';

  if plus_active and completed_months >= 1 then
    latest_subscription_badge := 'assinatura_' || lpad(least(completed_months, 50)::text, 2, '0') || '_meses';
  else
    select b.badge_key into latest_subscription_badge
    from public.user_badges b
    where b.user_id = current_user_id and b.badge_key ~ '^assinatura_[0-9]{2}_meses$'
    order by substring(b.badge_key from '[0-9]+')::integer desc
    limit 1;
  end if;

  if latest_subscription_badge is not null then
    delete from public.user_badges b
    where b.user_id = current_user_id
      and b.badge_key ~ '^assinatura_[0-9]{2}_meses$'
      and b.badge_key <> latest_subscription_badge;

    update public.profiles p
    set selected_badge_keys = array(
      select selected.key
      from unnest(p.selected_badge_keys) as selected(key)
      where selected.key !~ '^assinatura_[0-9]{2}_meses$'
         or selected.key = latest_subscription_badge
    )
    where p.id = current_user_id;
  end if;

  with eligible(badge_key) as (
    select '150_tarefas' where current_role = 'dono' or task_count >= 150
    union all select '30_checkin_days' where current_role = 'dono' or checkin_count >= 30
    union all select '50_quizzes_90_plus' where current_role = 'dono' or quiz_count >= 50
    union all select '50_biblioteca' where current_role = 'dono' or library_count >= 50
    union all select 'amigo_lifetime' where current_role = 'dono' or current_tier = 'lifetime'
    union all select 'beta_tester' where current_role = 'dono' or is_beta
    union all select 'dono' where current_role = 'dono'
    union all select 'vip_plus' where current_role = 'dono' or plus_active
    union all select 'assinante_anual' where current_role = 'dono' or annual_active
    union all select latest_subscription_badge where latest_subscription_badge is not null
  ), inserted as (
    insert into public.user_badges (user_id, badge_key)
    select current_user_id, eligible.badge_key
    from eligible
    on conflict (user_id, badge_key) do nothing
    returning 1
  )
  select count(*)::integer into newly_unlocked from inserted;

  return newly_unlocked;
end;
$function$;

revoke all on function public.sync_my_gamification_badges() from public, anon;
grant execute on function public.sync_my_gamification_badges() to authenticated;

-- Catálogo especial e concessão server-side para impedir autoatribuição de insígnias.
alter table public.profiles
  add column if not exists is_beta_tester boolean not null default false;

alter table public.redemption_codes
  drop constraint if exists redemption_codes_tier_check;
alter table public.redemption_codes
  add constraint redemption_codes_tier_check
  check (tier = any (array['parceiro'::text, 'lifetime'::text, 'beta_tester'::text]));

create or replace function public.redeem_code(input_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  found_tier text;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Entre na sua conta para resgatar um código.';
  end if;

  update public.redemption_codes
  set redeemed_by = current_user_id, redeemed_at = now()
  where code = upper(trim(input_code)) and redeemed_by is null
  returning tier into found_tier;

  if found_tier is null then
    raise exception 'Código inválido ou já usado.';
  end if;

  if found_tier = 'beta_tester' then
    update public.profiles set is_beta_tester = true where id = current_user_id;
  else
    update public.profiles set account_tier = found_tier where id = current_user_id;
  end if;

  return found_tier;
end;
$function$;

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
          extract(year from age(now(), coalesce(s.current_period_start, s.created_at)))::integer * 12 +
          extract(month from age(now(), coalesce(s.current_period_start, s.created_at)))::integer)
        else 0
      end
    ), 0)
  into plus_active, annual_active, completed_months
  from public.billing_subscriptions s
  where s.user_id = current_user_id and s.plan_key = 'plus';

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
    union all
      select 'assinatura_' || lpad(month_number::text, 2, '0') || '_meses'
      from generate_series(1, 50) as month_number
      where current_role = 'dono' or (plus_active and month_number <= completed_months)
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

drop policy if exists "insert own badges" on public.user_badges;
revoke insert, update, delete on public.user_badges from anon, authenticated;
grant select on public.user_badges to authenticated;

-- Concede o catálogo completo à conta do Dono já existente, mantendo os timestamps antigos.
insert into public.user_badges (user_id, badge_key)
select p.id, badge.badge_key
from public.profiles p
cross join lateral (
  values
    ('150_tarefas'), ('30_checkin_days'), ('50_quizzes_90_plus'), ('50_biblioteca'),
    ('amigo_lifetime'), ('beta_tester'), ('dono'), ('vip_plus'), ('assinante_anual')
) as badge(badge_key)
where p.role = 'dono'
on conflict (user_id, badge_key) do nothing;

insert into public.user_badges (user_id, badge_key)
select p.id, 'assinatura_' || lpad(month_number::text, 2, '0') || '_meses'
from public.profiles p
cross join generate_series(1, 50) as month_number
where p.role = 'dono'
on conflict (user_id, badge_key) do nothing;

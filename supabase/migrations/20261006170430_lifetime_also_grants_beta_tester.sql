-- Lifetime também representa participação no beta: a conta recebe as duas insígnias.
-- O gatilho cobre resgates e qualquer concessão de Lifetime feita pelo fluxo administrativo.
create or replace function app_private.grant_lifetime_badges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set is_beta_tester = true
  where id = new.id and not is_beta_tester;

  insert into public.user_badges (user_id, badge_key)
  values (new.id, 'amigo_lifetime'), (new.id, 'beta_tester')
  on conflict (user_id, badge_key) do nothing;

  return new;
end;
$$;

revoke all on function app_private.grant_lifetime_badges() from public, anon, authenticated;

drop trigger if exists profiles_lifetime_badges_on_insert on public.profiles;
create trigger profiles_lifetime_badges_on_insert
  after insert on public.profiles
  for each row
  when (new.account_tier = 'lifetime')
  execute function app_private.grant_lifetime_badges();

drop trigger if exists profiles_lifetime_badges_on_tier_change on public.profiles;
create trigger profiles_lifetime_badges_on_tier_change
  after update of account_tier on public.profiles
  for each row
  when (new.account_tier = 'lifetime')
  execute function app_private.grant_lifetime_badges();

-- Atualiza as contas Lifetime já existentes para não limitar o benefício a novos resgates.
update public.profiles
set is_beta_tester = true
where account_tier = 'lifetime' and not is_beta_tester;

insert into public.user_badges (user_id, badge_key)
select p.id, badge.badge_key
from public.profiles p
cross join (values ('amigo_lifetime'::text), ('beta_tester'::text)) as badge(badge_key)
where p.account_tier = 'lifetime'
on conflict (user_id, badge_key) do nothing;

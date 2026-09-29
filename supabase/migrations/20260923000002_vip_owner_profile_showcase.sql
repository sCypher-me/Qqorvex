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

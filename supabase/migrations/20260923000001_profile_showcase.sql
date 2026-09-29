-- Preferências de identidade exibidas no perfil compacto da tela Hoje.
alter table public.profiles
  add column if not exists selected_title text,
  add column if not exists selected_badge_keys text[] not null default '{}';

alter table public.profiles
  drop constraint if exists profiles_selected_badges_max;

alter table public.profiles
  add constraint profiles_selected_badges_max
  check (cardinality(selected_badge_keys) <= 3);

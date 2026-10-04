-- Papel do usuário e nível de acesso — base pro Painel Manager. Hoje todo mundo tem acesso
-- total de graça; account_tier é só uma etiqueta preparada pro dia que existir um plano pago.
alter table public.profiles
  add column role text not null default 'usuario' check (role in ('usuario', 'dono')),
  add column account_tier text not null default 'padrao' check (account_tier in ('padrao', 'parceiro', 'lifetime'));

-- SECURITY DEFINER evita recursão de RLS ao checar se o usuário atual é dono (uma policy em
-- `profiles` não pode fazer subquery direta em `profiles` sob RLS sem essa camada).
create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'dono');
$$;

revoke execute on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

-- Dono enxerga todos os perfis (gestão de contas do Painel Manager); usuário comum continua só
-- vendo o próprio (policy já existente, profiles_select_own).
create policy profiles_select_owner on public.profiles
  for select
  to authenticated
  using (public.is_owner());

-- Códigos de resgate (lifetime/parceiro) — geração e listagem restritas ao dono via RLS;
-- resgate acontece por função (abaixo), não INSERT/UPDATE direto do usuário comum.
create table public.redemption_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  tier text not null check (tier in ('parceiro', 'lifetime')),
  note text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz
);

alter table public.redemption_codes enable row level security;

create policy redemption_codes_owner_all on public.redemption_codes
  for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- Qualquer autenticado pode tentar resgatar um código — a função valida (existe, não usado) e
-- marca redeemed_by/redeemed_at + atualiza account_tier do próprio perfil, tudo atômico.
create or replace function public.redeem_code(input_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  found_tier text;
begin
  update public.redemption_codes
  set redeemed_by = auth.uid(), redeemed_at = now()
  where code = input_code and redeemed_by is null
  returning tier into found_tier;

  if found_tier is null then
    raise exception 'Código inválido ou já usado.';
  end if;

  update public.profiles set account_tier = found_tier where id = auth.uid();
  return found_tier;
end;
$$;

revoke execute on function public.redeem_code(text) from public;
grant execute on function public.redeem_code(text) to authenticated;

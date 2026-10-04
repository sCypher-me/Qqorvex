-- Carteira de acompanhamento: quantidades/custo médio pertencem ao usuário; cotações vêm do provedor.
create table public.investment_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_type text not null check (asset_type = any (array['crypto'::text, 'stock'::text, 'fii'::text])),
  symbol text not null check (symbol ~ '^[A-Z0-9.-]{1,15}$'),
  quantity numeric(24, 8) not null default 0 check (quantity >= 0),
  average_price numeric(24, 8) not null default 0 check (average_price >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, asset_type, symbol)
);

alter table public.investment_positions enable row level security;
revoke all on public.investment_positions from anon, public;
grant select, insert, update, delete on public.investment_positions to authenticated;

create policy investment_positions_select_own on public.investment_positions
  for select to authenticated using (user_id = auth.uid());
create policy investment_positions_insert_own on public.investment_positions
  for insert to authenticated with check (user_id = auth.uid());
create policy investment_positions_update_own on public.investment_positions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy investment_positions_delete_own on public.investment_positions
  for delete to authenticated using (user_id = auth.uid());

-- O Dono pode moderar títulos e banir usuários sem dar acesso administrativo ao navegador.
drop function if exists public.list_all_accounts();
create function public.list_all_accounts()
returns table (
  id uuid,
  email text,
  display_name text,
  username citext,
  role text,
  account_tier text,
  created_at timestamptz,
  is_banned boolean,
  selected_title text
)
language sql
security definer
set search_path = ''
as $$
  select p.id, u.email, p.display_name, p.username, p.role, p.account_tier, p.created_at,
         coalesce(u.banned_until > now(), false), p.selected_title
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_owner()
  order by p.created_at desc;
$$;
revoke execute on function public.list_all_accounts() from public, anon;
grant execute on function public.list_all_accounts() to authenticated;

create or replace function public.owner_set_account_title(p_user_id uuid, p_title text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_title text := nullif(trim(p_title), '');
begin
  if not public.is_owner() then raise exception 'Só o Dono pode alterar títulos.'; end if;
  if p_user_id is null then raise exception 'Conta inválida.'; end if;
  if clean_title is not null and char_length(clean_title) > 40 then raise exception 'O título pode ter até 40 caracteres.'; end if;
  update public.profiles set selected_title = clean_title where id = p_user_id;
  if not found then raise exception 'Conta não encontrada.'; end if;
end;
$$;
revoke execute on function public.owner_set_account_title(uuid, text) from public, anon;
grant execute on function public.owner_set_account_title(uuid, text) to authenticated;

create or replace function public.owner_set_account_banned(p_user_id uuid, p_banned boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role text;
begin
  if not public.is_owner() then raise exception 'Só o Dono pode banir ou reativar contas.'; end if;
  if p_user_id is null or p_user_id = auth.uid() then raise exception 'Não é possível banir a própria conta.'; end if;
  select role into target_role from public.profiles where id = p_user_id;
  if not found then raise exception 'Conta não encontrada.'; end if;
  if target_role = 'dono' then raise exception 'Não é possível banir outra conta de Dono.'; end if;
  update auth.users set banned_until = case when p_banned then now() + interval '100 years' else null end where id = p_user_id;
  if p_banned then delete from auth.sessions where user_id = p_user_id; end if;
end;
$$;
revoke execute on function public.owner_set_account_banned(uuid, boolean) from public, anon;
grant execute on function public.owner_set_account_banned(uuid, boolean) to authenticated;

-- Concluir e remover solicitações permanece restrito ao Dono, com os grants mínimos necessários.
grant update (invited_at, rejected_at), delete on public.waitlist_signups to authenticated;
drop policy if exists waitlist_owner_delete on public.waitlist_signups;
create policy waitlist_owner_delete on public.waitlist_signups
  for delete to authenticated using (public.is_owner());

-- Substitui a policy FOR ALL antiga: policies permissivas são combinadas com OR e, sozinha,
-- ela permitiria remover também códigos que já foram resgatados.
drop policy if exists redemption_codes_owner_all on public.redemption_codes;
drop policy if exists redemption_codes_owner_select on public.redemption_codes;
drop policy if exists redemption_codes_owner_insert on public.redemption_codes;
drop policy if exists redemption_codes_owner_update on public.redemption_codes;
drop policy if exists redemption_codes_owner_revoke_pending on public.redemption_codes;
revoke all on public.redemption_codes from anon, authenticated;
grant select, insert, delete on public.redemption_codes to authenticated;
create policy redemption_codes_owner_select on public.redemption_codes
  for select to authenticated using (public.is_owner());
create policy redemption_codes_owner_insert on public.redemption_codes
  for insert to authenticated with check (public.is_owner());
create policy redemption_codes_owner_revoke_pending on public.redemption_codes
  for delete to authenticated using (public.is_owner() and redeemed_by is null);

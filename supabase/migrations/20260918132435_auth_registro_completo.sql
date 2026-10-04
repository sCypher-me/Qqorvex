
-- Campos novos do formulário de cadastro completo (nome completo, telefone) — username já existia.
-- Nulos permitidos: perfis já existentes não têm esses dados, e telefone é sempre opcional.
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists phone text;

alter table public.profiles add constraint full_name_not_blank
  check (full_name is null or length(btrim(full_name)) > 0);

-- E.164: + seguido de 8 a 15 dígitos (padrão ITU). Telefone é sempre armazenado normalizado assim;
-- a máscara "(62) 9 1234-5678" é só apresentação no frontend.
alter table public.profiles add constraint phone_e164
  check (phone is null or phone ~ '^\+[1-9]\d{7,14}$');

-- Gera "qqXXXXX" (5 caracteres, alfabeto sem 0/o/1/l/i pra evitar confusão visual em um username
-- exibido pro usuário) — usado quando o cadastro não informa username. A checagem de colisão real
-- acontece em handle_new_user (loop até achar um livre), esta função só gera um candidato.
create or replace function public.generate_qq_username()
returns text
language sql
volatile
as $$
  select 'qq' || (
    select string_agg(substr('abcdefghjkmnpqrstuvwxyz23456789', ceil(random() * 31)::int, 1), '')
    from generate_series(1, 5)
  );
$$;

revoke all on function public.generate_qq_username() from public;

-- Substitui o handle_new_user existente: agora também grava full_name/phone vindos do metadata do
-- signUp() e garante um username (o que o usuário digitou, normalizado, ou um "qqXXXXX" gerado e
-- checado contra colisão em loop — nunca confia só na aleatoriedade sem conferir unicidade).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  candidate_username extensions.citext;
  requested_username text;
begin
  requested_username := nullif(btrim(lower(new.raw_user_meta_data ->> 'username')), '');

  if requested_username is not null and requested_username ~ '^[a-z0-9_]{3,20}$'
     and not exists (select 1 from public.profiles where username = requested_username::extensions.citext) then
    candidate_username := requested_username::extensions.citext;
  else
    loop
      candidate_username := public.generate_qq_username()::extensions.citext;
      exit when not exists (select 1 from public.profiles where username = candidate_username);
    end loop;
  end if;

  insert into public.profiles (id, display_name, full_name, username, phone)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    candidate_username,
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), '')
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to service_role, postgres;

-- Checagem de disponibilidade de username pro formulário de cadastro (feedback em tempo real).
-- Precisa ser chamável por "anon" de propósito: acontece ANTES de existir sessão (durante o
-- preenchimento do cadastro). Retorna só um boolean — nunca expõe quem é o dono do username.
create or replace function public.is_username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    candidate ~ '^[a-z0-9_]{3,20}$'
    and not exists (select 1 from public.profiles where username = lower(btrim(candidate))::extensions.citext);
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

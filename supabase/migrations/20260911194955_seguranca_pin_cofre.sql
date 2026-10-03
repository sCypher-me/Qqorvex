-- Central de Segurança — PIN do Cofre (docs/decisions/central-seguranca-pin-design.md). PIN
-- destrava só o Cofre de Documentos, validado no servidor (não no cliente) pra ser mais difícil
-- de burlar. Hash via pgcrypto (já instalado, extensão isolada em `extensions`, mesmo padrão
-- desde profiles_hardening). 5 tentativas erradas bloqueiam por 5 minutos.
alter table public.profiles
  add column pin_hash text,
  add column pin_failed_attempts int not null default 0,
  add column pin_locked_until timestamptz;

create or replace function public.has_security_pin() returns boolean
  language sql security definer set search_path = ''
  as $$ select pin_hash is not null from public.profiles where id = auth.uid(); $$;

create or replace function public.set_security_pin(new_pin text) returns void
  language plpgsql security definer set search_path = ''
  as $$
  begin
    if length(new_pin) < 6 or new_pin !~ '^[0-9]+$' then
      raise exception 'O PIN precisa ter pelo menos 6 dígitos numéricos.';
    end if;
    update public.profiles
    set pin_hash = extensions.crypt(new_pin, extensions.gen_salt('bf')),
        pin_failed_attempts = 0, pin_locked_until = null
    where id = auth.uid();
  end;
  $$;

create or replace function public.verify_security_pin(candidate_pin text) returns boolean
  language plpgsql security definer set search_path = ''
  as $$
  declare
    stored_hash text;
    failed_attempts int;
    locked_until timestamptz;
    is_correct boolean;
  begin
    select pin_hash, pin_failed_attempts, pin_locked_until
      into stored_hash, failed_attempts, locked_until
      from public.profiles where id = auth.uid();

    if stored_hash is null then return false; end if;
    if locked_until is not null and locked_until > now() then return false; end if;

    is_correct := stored_hash = extensions.crypt(candidate_pin, stored_hash);

    if is_correct then
      update public.profiles set pin_failed_attempts = 0, pin_locked_until = null where id = auth.uid();
    else
      failed_attempts := failed_attempts + 1;
      update public.profiles
      set pin_failed_attempts = failed_attempts,
          pin_locked_until = case when failed_attempts >= 5 then now() + interval '5 minutes' else null end
      where id = auth.uid();
    end if;

    return is_correct;
  end;
  $$;

revoke execute on function public.has_security_pin() from anon;
revoke execute on function public.set_security_pin(text) from anon;
revoke execute on function public.verify_security_pin(text) from anon;
grant execute on function public.has_security_pin() to authenticated;
grant execute on function public.set_security_pin(text) to authenticated;
grant execute on function public.verify_security_pin(text) to authenticated;

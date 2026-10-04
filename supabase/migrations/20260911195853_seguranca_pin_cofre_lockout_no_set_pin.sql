-- set_security_pin verificava o PIN atual sem checar pin_locked_until — dava pra contornar o
-- bloqueio de 5 tentativas de verify_security_pin testando o PIN atual aqui em vez de lá.
create or replace function public.set_security_pin(new_pin text, current_pin text default null) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare
    stored_hash text;
    locked_until timestamptz;
    failed_attempts int;
  begin
    if length(new_pin) < 6 or new_pin !~ '^[0-9]+$' then
      raise exception 'O PIN precisa ter pelo menos 6 dígitos numéricos.';
    end if;

    select pin_hash, pin_locked_until, pin_failed_attempts
      into stored_hash, locked_until, failed_attempts
      from public.profiles where id = auth.uid();

    if stored_hash is not null then
      if locked_until is not null and locked_until > now() then
        raise exception 'Cofre bloqueado por tentativas erradas — tente de novo mais tarde.';
      end if;
      if current_pin is null or stored_hash != extensions.crypt(current_pin, stored_hash) then
        failed_attempts := failed_attempts + 1;
        update public.profiles
        set pin_failed_attempts = failed_attempts,
            pin_locked_until = case when failed_attempts >= 5 then now() + interval '5 minutes' else null end
        where id = auth.uid();
        raise exception 'PIN atual incorreto.';
      end if;
    end if;

    update public.profiles
    set pin_hash = extensions.crypt(new_pin, extensions.gen_salt('bf')),
        pin_failed_attempts = 0, pin_locked_until = null
    where id = auth.uid();
  end;
  $$;

revoke execute on function public.set_security_pin(text, text) from anon;
grant execute on function public.set_security_pin(text, text) to authenticated;

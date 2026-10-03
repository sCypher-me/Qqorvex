-- Corrige set_security_pin pra exigir o PIN atual antes de trocar, quando já existe um — o design
-- prometia isso e a versão anterior deixava qualquer sessão autenticada sobrescrever sem provar
-- que conhece o PIN vigente.
create or replace function public.set_security_pin(new_pin text, current_pin text default null) returns void
  language plpgsql security definer set search_path = ''
  as $$
  declare
    stored_hash text;
  begin
    if length(new_pin) < 6 or new_pin !~ '^[0-9]+$' then
      raise exception 'O PIN precisa ter pelo menos 6 dígitos numéricos.';
    end if;

    select pin_hash into stored_hash from public.profiles where id = auth.uid();

    if stored_hash is not null then
      if current_pin is null or stored_hash != extensions.crypt(current_pin, stored_hash) then
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

-- Central de Segurança (backlog, seção 2):
--   1. Códigos de recuperação do 2FA: 10 códigos de uso único; gerar um conjunto novo invalida o
--      anterior; só com a sessão em aal2 (acabou de passar pelo autenticador). Usar um código no
--      login remove o 2FA da conta para a pessoa entrar e cadastrar de novo.
--   2. Confirmação de identidade por senha atual (ações sensíveis), sem trocar a sessão.
--   3. Aparelhos conhecidos: o send-notifications (a cada 5 min) recebe só os acessos de um
--      aparelho novo e avisa por push.
-- Tentativas erradas de código e de senha têm limite por hora.

create schema if not exists app_private;

create table if not exists app_private.mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists mfa_recovery_codes_user_idx on app_private.mfa_recovery_codes (user_id);

create table if not exists app_private.security_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('recovery_code', 'password')),
  attempted_at timestamptz not null default now()
);
create index if not exists security_attempts_user_kind_idx on app_private.security_attempts (user_id, kind, attempted_at desc);

create table if not exists app_private.known_devices (
  user_id uuid not null references auth.users(id) on delete cascade,
  device text not null,
  first_seen_at timestamptz not null default now(),
  primary key (user_id, device)
);

alter table app_private.mfa_recovery_codes enable row level security;
alter table app_private.security_attempts enable row level security;
alter table app_private.known_devices enable row level security;
revoke all on app_private.mfa_recovery_codes, app_private.security_attempts, app_private.known_devices from public, anon, authenticated;

/* ───────────── 1. Códigos de recuperação ───────────── */

create or replace function app_private.random_recovery_code()
returns text language plpgsql volatile set search_path = ''
as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  bytes bytea := extensions.gen_random_bytes(10);
  result text := '';
begin
  for i in 0..9 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % 31) + 1, 1);
    if i = 4 then result := result || '-'; end if;
  end loop;
  return result;
end;
$$;

create or replace function app_private.recovery_code_hash(code text)
returns text language sql immutable set search_path = ''
as $$
  -- Aceita com ou sem hífen, maiúsculas ou espaços: "ABCDE FGHJK" = "abcde-fghjk".
  select encode(extensions.digest(
    substr(lower(regexp_replace(coalesce(code, ''), '[^a-zA-Z0-9]', '', 'g')), 1, 5) || '-' ||
    substr(lower(regexp_replace(coalesce(code, ''), '[^a-zA-Z0-9]', '', 'g')), 6),
    'sha256'), 'hex');
$$;

create or replace function app_private.too_many_attempts(kind text, max_attempts integer, window_size interval)
returns boolean language sql stable security definer set search_path = ''
as $$
  select count(*) >= max_attempts from app_private.security_attempts a
  where a.user_id = auth.uid() and a.kind = too_many_attempts.kind and a.attempted_at > now() - window_size;
$$;

create or replace function public.generate_mfa_recovery_codes()
returns text[] language plpgsql security definer set search_path = ''
as $$
declare
  codes text[] := '{}';
  code text;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
    raise exception 'mfa_required' using errcode = '42501', hint = 'Confirme com o app autenticador antes de gerar códigos.';
  end if;
  delete from app_private.mfa_recovery_codes where user_id = auth.uid();
  for i in 1..10 loop
    code := app_private.random_recovery_code();
    codes := codes || code;
    insert into app_private.mfa_recovery_codes (user_id, code_hash) values (auth.uid(), app_private.recovery_code_hash(code));
  end loop;
  return codes;
end;
$$;

create or replace function public.count_mfa_recovery_codes()
returns integer language sql stable security definer set search_path = ''
as $$
  select count(*)::integer from app_private.mfa_recovery_codes where user_id = auth.uid() and used_at is null;
$$;

-- No login (sessão aal1 com 2FA pendente): um código válido remove os fatores TOTP da conta.
create or replace function public.use_mfa_recovery_code(code text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  matched uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if app_private.too_many_attempts('recovery_code', 5, interval '1 hour') then
    raise exception 'too_many_attempts' using errcode = 'P0001', hint = 'Muitas tentativas. Espere uma hora e tente de novo.';
  end if;
  update app_private.mfa_recovery_codes set used_at = now()
  where user_id = auth.uid() and used_at is null and code_hash = app_private.recovery_code_hash(code)
  returning id into matched;
  if matched is null then
    insert into app_private.security_attempts (user_id, kind) values (auth.uid(), 'recovery_code');
    return false;
  end if;
  delete from auth.mfa_factors where user_id = auth.uid() and factor_type = 'totp';
  delete from app_private.mfa_recovery_codes where user_id = auth.uid();
  return true;
end;
$$;

/* ───────────── 2. Confirmar identidade pela senha atual ───────────── */

create or replace function public.i_have_password()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(u.encrypted_password, '') <> '' from auth.users u where u.id = auth.uid();
$$;

create or replace function public.verify_my_password(password text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  ok boolean;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if app_private.too_many_attempts('password', 5, interval '15 minutes') then
    raise exception 'too_many_attempts' using errcode = 'P0001', hint = 'Muitas tentativas. Espere alguns minutos.';
  end if;
  select coalesce(u.encrypted_password, '') <> '' and u.encrypted_password = extensions.crypt(password, u.encrypted_password)
  into ok from auth.users u where u.id = auth.uid();
  if not coalesce(ok, false) then
    insert into app_private.security_attempts (user_id, kind) values (auth.uid(), 'password');
    return false;
  end if;
  return true;
end;
$$;

/* ───────────── 3. Aparelhos conhecidos ───────────── */

create or replace function app_private.device_label(ua text)
returns text language sql immutable set search_path = ''
as $$
  select (case
      when ua ~* 'edg/' then 'Edge'
      when ua ~* 'opr/|opera' then 'Opera'
      when ua ~* 'samsungbrowser' then 'Samsung Internet'
      when ua ~* 'firefox|fxios' then 'Firefox'
      when ua ~* '; wv\)' then 'App Qqorvex'
      when ua ~* 'chrome|crios' then 'Chrome'
      when ua ~* 'safari' then 'Safari'
      else 'Navegador'
    end) || ' no ' || (case
      when ua ~* 'android' then 'Android'
      when ua ~* 'iphone|ipad|ipod' then 'iPhone/iPad'
      when ua ~* 'windows' then 'Windows'
      when ua ~* 'mac os|macintosh' then 'Mac'
      when ua ~* 'cros' then 'Chromebook'
      when ua ~* 'linux' then 'Linux'
      else 'outro sistema'
    end);
$$;

-- Tudo o que já existe vira conhecido: o aviso só vale para acessos a partir de agora.
insert into app_private.known_devices (user_id, device, first_seen_at)
select s.user_id, app_private.device_label(s.user_agent), min(s.created_at)
from auth.sessions s
where coalesce(s.user_agent, '') <> ''
group by 1, 2
on conflict do nothing;

-- Só o send-notifications (service_role) chama. Registra os aparelhos dos acessos recentes e
-- devolve apenas os que eram desconhecidos para uma conta que já tinha outros aparelhos.
create or replace function public.claim_new_device_logins(since timestamptz)
returns table (alert_session_id uuid, alert_user_id uuid, alert_device text, alert_ip text, alert_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  had_devices boolean;
  inserted integer;
begin
  for r in
    select s.id, s.user_id, app_private.device_label(s.user_agent) as device, s.ip::text as ip, s.created_at
    from auth.sessions s
    where s.created_at > since and coalesce(s.user_agent, '') <> ''
    order by s.created_at
  loop
    select exists (select 1 from app_private.known_devices k where k.user_id = r.user_id) into had_devices;
    insert into app_private.known_devices (user_id, device, first_seen_at) values (r.user_id, r.device, r.created_at)
    on conflict do nothing;
    get diagnostics inserted = row_count;
    if inserted > 0 and had_devices then
      alert_session_id := r.id;
      alert_user_id := r.user_id;
      alert_device := r.device;
      alert_ip := r.ip;
      alert_at := r.created_at;
      return next;
    end if;
  end loop;
end;
$$;

revoke all on function app_private.random_recovery_code() from public, anon, authenticated;
revoke all on function app_private.recovery_code_hash(text) from public, anon, authenticated;
revoke all on function app_private.too_many_attempts(text, integer, interval) from public, anon, authenticated;
revoke all on function app_private.device_label(text) from public, anon, authenticated;
revoke all on function public.generate_mfa_recovery_codes() from public, anon;
revoke all on function public.count_mfa_recovery_codes() from public, anon;
revoke all on function public.use_mfa_recovery_code(text) from public, anon;
revoke all on function public.i_have_password() from public, anon;
revoke all on function public.verify_my_password(text) from public, anon;
revoke all on function public.claim_new_device_logins(timestamptz) from public, anon, authenticated;
grant execute on function public.generate_mfa_recovery_codes() to authenticated;
grant execute on function public.count_mfa_recovery_codes() to authenticated;
grant execute on function public.use_mfa_recovery_code(text) to authenticated;
grant execute on function public.i_have_password() to authenticated;
grant execute on function public.verify_my_password(text) to authenticated;
grant execute on function public.claim_new_device_logins(timestamptz) to service_role;

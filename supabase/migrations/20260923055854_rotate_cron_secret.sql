-- Rotação única após remover o segredo literal dos comandos pg_cron.
-- O formato hexadecimal evita caracteres de transporte inesperados no header HTTP.

do $$
declare
  new_secret text := encode(gen_random_bytes(32), 'hex');
  vault_secret_id uuid;
begin
  update public.app_secrets
     set value = new_secret,
         updated_at = now()
   where key = 'cron_secret';

  if not found then
    raise exception 'app_secrets.cron_secret não encontrado para rotação';
  end if;

  select id
    into vault_secret_id
    from vault.secrets
   where name = 'qqorvex_cron_secret'
   limit 1;

  if vault_secret_id is null then
    raise exception 'Vault secret qqorvex_cron_secret não encontrado';
  end if;

  perform vault.update_secret(
    vault_secret_id,
    new_secret,
    'qqorvex_cron_secret',
    'Segredo usado exclusivamente pelos jobs pg_cron do Qqorvex',
    null
  );
end $$;

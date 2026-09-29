-- Não mantenha o segredo de autenticação dos jobs pg_cron no texto do próprio job.
-- O comando de cron é metadata administrativa e pode aparecer em diagnósticos.
-- O valor continua sendo a mesma fonte configurada em app_secrets, mas passa a ser
-- armazenado criptografado no Vault e resolvido somente no momento da chamada HTTP.

do $$
declare
  current_secret text;
  vault_secret_id uuid;
begin
  select value
    into current_secret
    from public.app_secrets
   where key = 'cron_secret';

  if current_secret is null or btrim(current_secret) = '' then
    raise exception 'app_secrets.cron_secret precisa estar configurado antes desta migração';
  end if;

  select id
    into vault_secret_id
    from vault.secrets
   where name = 'qqorvex_cron_secret'
   limit 1;

  if vault_secret_id is null then
    perform vault.create_secret(
      current_secret,
      'qqorvex_cron_secret',
      'Segredo usado exclusivamente pelos jobs pg_cron do Qqorvex',
      null
    );
  else
    perform vault.update_secret(
      vault_secret_id,
      current_secret,
      'qqorvex_cron_secret',
      'Segredo usado exclusivamente pelos jobs pg_cron do Qqorvex',
      null
    );
  end if;
end $$;

select cron.alter_job(
  1,
  command := $cron$
    select net.http_post(
      url := 'https://uowipikbumbaprckdvkg.supabase.co/functions/v1/send-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'qqorvex_cron_secret')
      ),
      body := '{}'::jsonb
    );
  $cron$
);

select cron.alter_job(
  2,
  command := $cron$
    select net.http_post(
      url := 'https://uowipikbumbaprckdvkg.supabase.co/functions/v1/sync-google-calendar',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'qqorvex_cron_secret')
      ),
      body := '{}'::jsonb
    );
  $cron$
);

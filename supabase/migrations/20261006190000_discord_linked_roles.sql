-- Cargos vinculados do Discord ("Linked Roles"): a pessoa conecta o Discord em Configurações →
-- Conexões e o servidor do Qqorvex dá sozinho os cargos de Beta Tester, Plus, Amigo Lifetime e
-- Parceiro conforme a conta. O fluxo é o mesmo do Google Agenda: um `state` opaco de uso único
-- criado no servidor (`discord-link`), consumido pelo retorno do OAuth (`discord-link-callback`).
-- `discord-roles-sync` (pg_cron, de hora em hora) mantém os cargos em dia quando o plano muda.

create table public.discord_oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index discord_oauth_states_user_id_idx on public.discord_oauth_states (user_id);

-- Só as Edge Functions (service_role) criam e consomem estados.
alter table public.discord_oauth_states enable row level security;
revoke all on table public.discord_oauth_states from public, anon, authenticated;

create table public.discord_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  discord_user_id text not null unique,
  discord_username text not null,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  role_metadata jsonb not null default '{}'::jsonb,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);

-- Tokens nunca chegam ao cliente (mesma proteção de google_calendar_connections).
alter table public.discord_connections enable row level security;
revoke all on table public.discord_connections from public, anon, authenticated;

-- O que o app mostra: só o nome no Discord, os cargos atuais e a última sincronização.
create or replace function public.get_my_discord_connection()
returns jsonb
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select jsonb_build_object(
    'username', connection.discord_username,
    'roles', connection.role_metadata,
    'synced_at', connection.synced_at
  )
  from public.discord_connections as connection
  where connection.user_id = auth.uid();
$$;

revoke all on function public.get_my_discord_connection() from public, anon;
grant execute on function public.get_my_discord_connection() to authenticated;

-- Metadados enviados ao Discord para uma conta. Mesmas regras de get_my_access():
-- Lifetime e Parceiro (com campanha ativa) vêm de profiles; Plus é a assinatura ativa;
-- Beta Tester é a insígnia (Lifetime já concede Beta Tester pelo gatilho existente).
create or replace function public.discord_role_metadata(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'beta_tester', (
      p.is_beta_tester
      or exists (select 1 from public.user_badges b where b.user_id = p.id and b.badge_key = 'beta_tester')
    ),
    'plus', exists (
      select 1 from public.billing_subscriptions s
      where s.user_id = p.id and s.plan_key = 'plus'
        and s.status in ('active', 'trialing', 'canceled') and s.current_period_end > now()
    ),
    'lifetime', p.account_tier = 'lifetime',
    'parceiro', (p.account_tier = 'parceiro' and coalesce(c.ends_at > now(), false)),
    'username', coalesce(p.username, p.display_name)
  )
  from public.profiles p
  left join public.partner_campaigns c on c.id = p.partner_campaign_id
  where p.id = p_user_id;
$$;

revoke all on function public.discord_role_metadata(uuid) from public, anon, authenticated;
grant execute on function public.discord_role_metadata(uuid) to service_role;

-- Sincronização de hora em hora (minuto 15), autenticada pelo mesmo segredo do agendador.
select cron.schedule(
  'qqorvex-discord-roles-sync',
  '15 * * * *',
  $cron$
    select net.http_post(
      url := 'https://uowipikbumbaprckdvkg.supabase.co/functions/v1/discord-roles-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'qqorvex_cron_secret')
      ),
      body := '{}'::jsonb
    );
  $cron$
);

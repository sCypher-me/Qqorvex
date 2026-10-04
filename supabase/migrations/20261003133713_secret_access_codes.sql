-- Códigos secretos que liberam acesso de verdade.
--
-- Três níveis de acesso: Free < Plus < Ilimitado. Ilimitado vale para o Dono, para contas
-- Lifetime (só nascem de código gerado pelo Dono — nunca de compra) e para Parceiros enquanto a
-- campanha deles estiver ativa. Quem é Ilimitado também passa em tudo que exige Plus.
--
-- Parceiro é temporário: cada código de Parceiro pertence a uma campanha com data de fim. Estender
-- ou encerrar a campanha vale para todos os parceiros dela de uma vez; ao acabar, a conta volta ao
-- plano que tinha (Free ou Plus) sem perder nada.

-- ── Campanhas de Parceiro ────────────────────────────────────────────────────────────────────
create table public.partner_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 80),
  ends_at timestamptz not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.partner_campaigns enable row level security;
revoke all on public.partner_campaigns from public, anon, authenticated;
grant select, insert, update, delete on public.partner_campaigns to authenticated;
create policy partner_campaigns_owner_all on public.partner_campaigns
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

create trigger partner_campaigns_set_updated_at
  before update on public.partner_campaigns
  for each row execute function public.set_updated_at();

alter table public.redemption_codes
  add column campaign_id uuid references public.partner_campaigns (id) on delete restrict;
alter table public.redemption_codes
  add constraint redemption_codes_partner_campaign
  check ((tier = 'parceiro') = (campaign_id is not null));
create index redemption_codes_campaign_idx on public.redemption_codes (campaign_id);

-- Fora das colunas liberadas ao cliente (profiles_least_privilege): só o resgate grava.
alter table public.profiles
  add column partner_campaign_id uuid references public.partner_campaigns (id) on delete set null;

-- ── Nível de acesso ──────────────────────────────────────────────────────────────────────────
create or replace function public.has_unlimited_access(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    left join public.partner_campaigns c on c.id = p.partner_campaign_id
    where p.id = p_user_id
      and (
        p.role = 'dono'
        or p.account_tier = 'lifetime'
        or (p.account_tier = 'parceiro' and c.ends_at > now())
      )
  );
$$;

revoke all on function public.has_unlimited_access(uuid) from public, anon, authenticated;
grant execute on function public.has_unlimited_access(uuid) to service_role;

-- Ilimitado cobre tudo que o Plus libera (temas, metas/hábitos/cadernos/mapas sem teto).
create or replace function public.has_plus_entitlement(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_unlimited_access(p_user_id) or exists (
    select 1
    from public.billing_subscriptions s
    where s.user_id = p_user_id
      and s.plan_key = 'plus'
      and s.status in ('active', 'trialing', 'canceled')
      and s.current_period_end > now()
  );
$$;

revoke all on function public.has_plus_entitlement(uuid) from public, anon, authenticated;
grant execute on function public.has_plus_entitlement(uuid) to service_role;

-- Vex sem cota para Ilimitado: o uso continua contado (estatística), mas nunca é recusado.
create or replace function public.consume_billing_quota(p_user_id uuid, p_feature text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  month_key date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
  unlimited boolean := public.has_unlimited_access(p_user_id);
  plus_active boolean := unlimited or public.has_plus_entitlement(p_user_id);
  feature_limit integer;
  used_count integer;
begin
  if p_user_id is null then raise exception 'user_id obrigatório'; end if;

  if p_feature = 'vex_ai_responses' then
    feature_limit := case when unlimited then null when plus_active then 300 else 50 end;
    insert into public.billing_usage_monthly (user_id, month_start, vex_ai_responses)
      values (p_user_id, month_key, 1)
      on conflict (user_id, month_start) do update
        set vex_ai_responses = billing_usage_monthly.vex_ai_responses + 1,
            updated_at = now()
      returning vex_ai_responses into used_count;
    if feature_limit is not null and used_count > feature_limit then
      update public.billing_usage_monthly set vex_ai_responses = greatest(vex_ai_responses - 1, 0)
        where user_id = p_user_id and month_start = month_key;
      return jsonb_build_object('allowed', false, 'used', feature_limit, 'limit', feature_limit, 'month_start', month_key);
    end if;
  elsif p_feature = 'vex_web_searches' then
    feature_limit := case when unlimited then null when plus_active then 60 else 10 end;
    insert into public.billing_usage_monthly (user_id, month_start, vex_web_searches)
      values (p_user_id, month_key, 1)
      on conflict (user_id, month_start) do update
        set vex_web_searches = billing_usage_monthly.vex_web_searches + 1,
            updated_at = now()
      returning vex_web_searches into used_count;
    if feature_limit is not null and used_count > feature_limit then
      update public.billing_usage_monthly set vex_web_searches = greatest(vex_web_searches - 1, 0)
        where user_id = p_user_id and month_start = month_key;
      return jsonb_build_object('allowed', false, 'used', feature_limit, 'limit', feature_limit, 'month_start', month_key);
    end if;
  else
    raise exception 'Recurso de cota inválido';
  end if;

  return jsonb_build_object(
    'allowed', true,
    'used', used_count,
    'limit', feature_limit,
    'month_start', month_key,
    'plan', case when unlimited then 'unlimited' when plus_active then 'plus' else 'free' end
  );
end;
$function$;

-- Documentos: sem cota por conta para Ilimitado (quota_bytes nulo = ilimitado). O tamanho de cada
-- arquivo continua limitado pelo próprio bucket (50 MB), o teto do Supabase para o projeto.
create or replace function app_private.document_storage_quota(p_user_id uuid, p_exclude_object_name text default null)
returns table (used_bytes bigint, quota_bytes bigint, max_file_bytes bigint, is_plus boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  unlimited boolean;
  plus_active boolean;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Acesso negado';
  end if;

  unlimited := public.has_unlimited_access(p_user_id);
  plus_active := unlimited or public.has_plus_entitlement(p_user_id);
  return query
    select
      coalesce(sum(
        case
          when coalesce(o.metadata ->> 'size', '') ~ '^[0-9]+$'
            then (o.metadata ->> 'size')::bigint
          else 0
        end
      ), 0)::bigint,
      case when unlimited then null::bigint when plus_active then 104857600::bigint else 26214400::bigint end,
      case when plus_active then 52428800::bigint else 10485760::bigint end,
      plus_active
    from storage.objects o
    where o.bucket_id = 'documents'
      and split_part(o.name, '/', 1) = p_user_id::text
      and (p_exclude_object_name is null or o.name <> p_exclude_object_name);
end;
$$;

-- O app mostra o nível sem precisar enxergar colunas privadas do perfil.
create or replace function public.get_my_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  profile_row record;
  campaign_name text;
  campaign_end timestamptz;
  plus_active boolean;
begin
  if current_user_id is null then
    raise exception 'Entre na sua conta.';
  end if;

  select p.role, p.account_tier, p.partner_campaign_id into profile_row
  from public.profiles p where p.id = current_user_id;

  select c.name, c.ends_at into campaign_name, campaign_end
  from public.partner_campaigns c where c.id = profile_row.partner_campaign_id;

  plus_active := exists (
    select 1 from public.billing_subscriptions s
    where s.user_id = current_user_id and s.plan_key = 'plus'
      and s.status in ('active', 'trialing', 'canceled') and s.current_period_end > now()
  );

  return jsonb_build_object(
    'level', case when public.has_unlimited_access(current_user_id) then 'unlimited' when plus_active then 'plus' else 'free' end,
    'source', case
      when profile_row.role = 'dono' then 'dono'
      when profile_row.account_tier = 'lifetime' then 'lifetime'
      when profile_row.account_tier = 'parceiro' and campaign_end > now() then 'parceiro'
      when plus_active then 'plus'
      else null
    end,
    'partner_until', case when profile_row.account_tier = 'parceiro' then campaign_end end,
    'partner_campaign', case when profile_row.account_tier = 'parceiro' then campaign_name end
  );
end;
$$;

revoke all on function public.get_my_access() from public, anon;
grant execute on function public.get_my_access() to authenticated;

-- ── Resgate ──────────────────────────────────────────────────────────────────────────────────
-- Tentativas erradas ficam registradas (e não somem num rollback, porque a função devolve o erro
-- em vez de lançar exceção): 5 erros em 15 minutos bloqueiam novos palpites por um tempo.
create table app_private.code_redemption_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now(),
  succeeded boolean not null
);
create index code_redemption_attempts_user_idx on app_private.code_redemption_attempts (user_id, attempted_at desc);
revoke all on app_private.code_redemption_attempts from public, anon, authenticated;

drop function if exists public.redeem_code(text);

create function public.redeem_code(input_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized text := regexp_replace(upper(coalesce(input_code, '')), '[^A-Z0-9]', '', 'g');
  code_row record;
  profile_row record;
  campaign_name text;
  campaign_end timestamptz;
  current_partner_end timestamptz;
  recent_failures integer;
begin
  if current_user_id is null then
    raise exception 'Entre na sua conta para resgatar um código.';
  end if;

  delete from app_private.code_redemption_attempts
    where user_id = current_user_id and attempted_at < now() - interval '1 day';
  select count(*) into recent_failures from app_private.code_redemption_attempts
    where user_id = current_user_id and not succeeded and attempted_at > now() - interval '15 minutes';
  if recent_failures >= 5 then
    return jsonb_build_object('ok', false, 'error', 'Muitas tentativas. Espere alguns minutos e tente de novo.');
  end if;

  select rc.id, rc.tier, rc.campaign_id into code_row
  from public.redemption_codes rc
  where regexp_replace(upper(rc.code), '[^A-Z0-9]', '', 'g') = normalized
    and rc.redeemed_by is null
  for update;

  if code_row.id is null or normalized = '' then
    insert into app_private.code_redemption_attempts (user_id, succeeded) values (current_user_id, false);
    return jsonb_build_object('ok', false, 'error', 'Código inválido ou já usado.');
  end if;

  select p.role, p.account_tier, p.is_beta_tester, p.partner_campaign_id into profile_row
  from public.profiles p where p.id = current_user_id for update;

  -- Recusas abaixo não gastam o código: ele continua valendo para outra pessoa.
  if code_row.tier = 'parceiro' then
    select c.name, c.ends_at into campaign_name, campaign_end from public.partner_campaigns c where c.id = code_row.campaign_id;
    if campaign_end is null or campaign_end <= now() then
      return jsonb_build_object('ok', false, 'error', 'A campanha deste código já terminou.');
    end if;
    if profile_row.role = 'dono' or profile_row.account_tier = 'lifetime' then
      return jsonb_build_object('ok', false, 'error', 'Sua conta já tem acesso ilimitado para sempre. Guarde o código para outra pessoa.');
    end if;
    if profile_row.account_tier = 'parceiro' then
      select c.ends_at into current_partner_end from public.partner_campaigns c where c.id = profile_row.partner_campaign_id;
      if current_partner_end >= campaign_end then
        return jsonb_build_object('ok', false, 'error', 'Você já é Parceiro numa campanha que vai até mais tarde. Guarde o código para outra pessoa.');
      end if;
    end if;
    update public.profiles set account_tier = 'parceiro', partner_campaign_id = code_row.campaign_id
      where id = current_user_id;
  elsif code_row.tier = 'lifetime' then
    if profile_row.role = 'dono' or profile_row.account_tier = 'lifetime' then
      return jsonb_build_object('ok', false, 'error', 'Sua conta já tem acesso ilimitado para sempre. Guarde o código para outra pessoa.');
    end if;
    update public.profiles set account_tier = 'lifetime', partner_campaign_id = null
      where id = current_user_id;
    insert into public.user_badges (user_id, badge_key) values (current_user_id, 'amigo_lifetime')
      on conflict (user_id, badge_key) do nothing;
  elsif code_row.tier = 'beta_tester' then
    if profile_row.is_beta_tester then
      return jsonb_build_object('ok', false, 'error', 'Você já é Beta Tester. Guarde o código para outra pessoa.');
    end if;
    update public.profiles set is_beta_tester = true where id = current_user_id;
    insert into public.user_badges (user_id, badge_key) values (current_user_id, 'beta_tester')
      on conflict (user_id, badge_key) do nothing;
  end if;

  update public.redemption_codes set redeemed_by = current_user_id, redeemed_at = now() where id = code_row.id;
  insert into app_private.code_redemption_attempts (user_id, succeeded) values (current_user_id, true);

  return jsonb_build_object(
    'ok', true,
    'tier', code_row.tier,
    'partner_until', campaign_end,
    'partner_campaign', campaign_name
  );
end;
$$;

revoke all on function public.redeem_code(text) from public, anon;
grant execute on function public.redeem_code(text) to authenticated;

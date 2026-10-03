-- Assinatura Plus e cotas. A assinatura comercial e independente do tier administrativo
-- (profiles.account_tier) e nunca apaga nem oculta dados quando o entitlement expira.

create table public.billing_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null check (provider in ('stripe', 'google_play')),
  plan_key text not null default 'plus' check (plan_key = 'plus'),
  billing_period text not null check (billing_period in ('monthly', 'annual')),
  status text not null check (status in (
    'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due',
    'canceled', 'unpaid', 'paused', 'expired'
  )),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  play_product_id text,
  play_purchase_token_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_subscription_provider_ref check (
    (provider = 'stripe' and stripe_subscription_id is not null)
    or (provider = 'google_play' and play_product_id is not null)
  )
);

create unique index billing_subscriptions_stripe_id_uidx
  on public.billing_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;
create unique index billing_subscriptions_play_token_uidx
  on public.billing_subscriptions (play_purchase_token_hash)
  where play_purchase_token_hash is not null;

create table public.billing_webhook_events (
  provider text not null check (provider in ('stripe', 'google_play')),
  event_id text not null,
  event_type text not null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

create table public.billing_usage_monthly (
  user_id uuid not null references auth.users (id) on delete cascade,
  month_start date not null,
  vex_ai_responses integer not null default 0 check (vex_ai_responses >= 0),
  vex_web_searches integer not null default 0 check (vex_web_searches >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, month_start)
);

alter table public.billing_subscriptions enable row level security;
alter table public.billing_webhook_events enable row level security;
alter table public.billing_usage_monthly enable row level security;

create policy "billing_subscriptions_select_own"
  on public.billing_subscriptions for select using (auth.uid() = user_id);
create policy "billing_usage_select_own"
  on public.billing_usage_monthly for select using (auth.uid() = user_id);

revoke all on public.billing_subscriptions, public.billing_webhook_events, public.billing_usage_monthly
  from anon, authenticated;
grant select on public.billing_subscriptions, public.billing_usage_monthly to authenticated;
grant all on public.billing_subscriptions, public.billing_webhook_events, public.billing_usage_monthly to service_role;

create trigger billing_subscriptions_set_updated_at
  before update on public.billing_subscriptions
  for each row execute function public.set_updated_at();

create or replace function public.has_plus_entitlement(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
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

create or replace function public.enforce_billing_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resource_key text;
  item_count integer;
  item_limit integer;
begin
  if public.has_plus_entitlement(new.user_id) then
    return new;
  end if;

  if tg_table_name = 'goals' then
    if new.status <> 'ativa' then return new; end if;
    resource_key := 'goals';
    item_limit := 5;
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':' || resource_key, 0));
    select count(*) into item_count from public.goals
      where user_id = new.user_id and status = 'ativa' and id <> new.id;
  elsif tg_table_name = 'habits' then
    if new.status <> 'ativo' then return new; end if;
    resource_key := 'habits';
    item_limit := 10;
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':' || resource_key, 0));
    select count(*) into item_count from public.habits
      where user_id = new.user_id and status = 'ativo' and id <> new.id;
  elsif tg_table_name = 'notebooks' then
    if new.status = 'arquivado' then return new; end if;
    resource_key := 'notebooks';
    item_limit := 5;
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':' || resource_key, 0));
    select count(*) into item_count from public.notebooks
      where user_id = new.user_id and status <> 'arquivado' and id <> new.id;
  elsif tg_table_name = 'pages' then
    if new.page_type <> 'mapa_mental' or new.is_archived then return new; end if;
    resource_key := 'mind_maps';
    item_limit := 5;
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':' || resource_key, 0));
    select count(*) into item_count from public.pages
      where user_id = new.user_id and page_type = 'mapa_mental'
        and not is_archived and id <> new.id;
  else
    return new;
  end if;

  if item_count >= item_limit then
    raise exception using
      errcode = 'P0001',
      message = 'QQORVEX_LIMIT:' || resource_key || ':' || item_limit::text;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_billing_capacity() from public, anon, authenticated;

create trigger billing_limit_goals
  before insert or update of user_id, status on public.goals
  for each row execute function public.enforce_billing_capacity();
create trigger billing_limit_habits
  before insert or update of user_id, status on public.habits
  for each row execute function public.enforce_billing_capacity();
create trigger billing_limit_notebooks
  before insert or update of user_id, status on public.notebooks
  for each row execute function public.enforce_billing_capacity();
create trigger billing_limit_mind_maps
  before insert or update of user_id, page_type, is_archived on public.pages
  for each row execute function public.enforce_billing_capacity();

create or replace function public.consume_billing_quota(p_user_id uuid, p_feature text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  month_key date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
  plus_active boolean := public.has_plus_entitlement(p_user_id);
  feature_limit integer;
  used_count integer;
begin
  if p_user_id is null then raise exception 'user_id obrigatório'; end if;

  if p_feature = 'vex_ai_responses' then
    feature_limit := case when plus_active then 300 else 50 end;
    insert into public.billing_usage_monthly (user_id, month_start, vex_ai_responses)
      values (p_user_id, month_key, 1)
      on conflict (user_id, month_start) do update
        set vex_ai_responses = billing_usage_monthly.vex_ai_responses + 1,
            updated_at = now()
      returning vex_ai_responses into used_count;
    if used_count > feature_limit then
      update public.billing_usage_monthly set vex_ai_responses = greatest(vex_ai_responses - 1, 0)
        where user_id = p_user_id and month_start = month_key;
      return jsonb_build_object('allowed', false, 'used', feature_limit, 'limit', feature_limit, 'month_start', month_key);
    end if;
  elsif p_feature = 'vex_web_searches' then
    feature_limit := case when plus_active then 60 else 10 end;
    insert into public.billing_usage_monthly (user_id, month_start, vex_web_searches)
      values (p_user_id, month_key, 1)
      on conflict (user_id, month_start) do update
        set vex_web_searches = billing_usage_monthly.vex_web_searches + 1,
            updated_at = now()
      returning vex_web_searches into used_count;
    if used_count > feature_limit then
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
    'plan', case when plus_active then 'plus' else 'free' end
  );
end;
$$;

create or replace function public.release_billing_quota(p_user_id uuid, p_feature text, p_month_start date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_feature = 'vex_ai_responses' then
    update public.billing_usage_monthly
      set vex_ai_responses = greatest(vex_ai_responses - 1, 0), updated_at = now()
      where user_id = p_user_id and month_start = p_month_start;
  elsif p_feature = 'vex_web_searches' then
    update public.billing_usage_monthly
      set vex_web_searches = greatest(vex_web_searches - 1, 0), updated_at = now()
      where user_id = p_user_id and month_start = p_month_start;
  else
    raise exception 'Recurso de cota inválido';
  end if;
end;
$$;

revoke all on function public.consume_billing_quota(uuid, text) from public, anon, authenticated;
revoke all on function public.release_billing_quota(uuid, text, date) from public, anon, authenticated;
grant execute on function public.consume_billing_quota(uuid, text) to service_role;
grant execute on function public.release_billing_quota(uuid, text, date) to service_role;

-- Cota do bucket privado de documentos. Versões e itens na lixeira continuam ocupando espaço,
-- portanto entram no cálculo até que o objeto físico seja removido.
create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;

create or replace function app_private.document_storage_quota(p_user_id uuid, p_exclude_object_name text default null)
returns table (used_bytes bigint, quota_bytes bigint, max_file_bytes bigint, is_plus boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  plus_active boolean;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Acesso negado';
  end if;

  plus_active := public.has_plus_entitlement(p_user_id);
  return query
    select
      coalesce(sum(
        case
          when coalesce(o.metadata ->> 'size', '') ~ '^[0-9]+$'
            then (o.metadata ->> 'size')::bigint
          else 0
        end
      ), 0)::bigint,
      case when plus_active then 104857600::bigint else 26214400::bigint end,
      case when plus_active then 52428800::bigint else 10485760::bigint end,
      plus_active
    from storage.objects o
    where o.bucket_id = 'documents'
      and split_part(o.name, '/', 1) = p_user_id::text
      and (p_exclude_object_name is null or o.name <> p_exclude_object_name);
end;
$$;

create or replace function app_private.can_upload_document(
  p_user_id uuid,
  p_object_name text,
  p_metadata jsonb
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  incoming_bytes bigint;
  quota record;
begin
  if auth.uid() is distinct from p_user_id
    or split_part(p_object_name, '/', 1) <> p_user_id::text then
    return false;
  end if;

  if coalesce(p_metadata ->> 'size', '') !~ '^[0-9]+$' then
    raise exception 'Não foi possível validar o tamanho do arquivo.';
  end if;
  incoming_bytes := (p_metadata ->> 'size')::bigint;

  -- Serializa uploads simultâneos da mesma conta para que não ultrapassem a cota juntos.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':documents', 0));
  select * into quota from app_private.document_storage_quota(p_user_id, p_object_name);

  if incoming_bytes > quota.max_file_bytes then
    raise exception using
      errcode = 'P0001',
      message = 'QQORVEX_DOCUMENT_FILE_LIMIT:' || quota.max_file_bytes::text;
  end if;

  -- Subtrair o objeto-alvo permite substituir conteúdo no mesmo caminho sem contar o antigo duas vezes.
  if quota.used_bytes + incoming_bytes > quota.quota_bytes then
    raise exception using
      errcode = 'P0001',
      message = 'QQORVEX_DOCUMENT_STORAGE_LIMIT:' || quota.quota_bytes::text;
  end if;
  return true;
end;
$$;

create or replace function public.get_my_document_storage_quota()
returns table (used_bytes bigint, quota_bytes bigint, max_file_bytes bigint, is_plus boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from app_private.document_storage_quota(auth.uid());
$$;

revoke all on function app_private.document_storage_quota(uuid, text) from public, anon;
revoke all on function app_private.can_upload_document(uuid, text, jsonb) from public, anon;
grant execute on function app_private.document_storage_quota(uuid, text) to authenticated;
grant execute on function app_private.can_upload_document(uuid, text, jsonb) to authenticated;
revoke all on function public.get_my_document_storage_quota() from public, anon;
grant execute on function public.get_my_document_storage_quota() to authenticated;

drop policy if exists "documents_storage_insert_own" on storage.objects;
create policy "documents_storage_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and split_part(name, '/', 1) = auth.uid()::text
    and app_private.can_upload_document(auth.uid(), name, metadata)
  );

drop policy if exists "documents_storage_update_own" on storage.objects;
create policy "documents_storage_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'documents' and split_part(name, '/', 1) = auth.uid()::text)
  with check (
    bucket_id = 'documents'
    and split_part(name, '/', 1) = auth.uid()::text
    and app_private.can_upload_document(auth.uid(), name, metadata)
  );

-- Infraestrutura de notificações (Web Push + pg_cron + Edge Function). "Definido posteriormente"
-- no Xmind para Agenda ("Lembretes têm tabela mas nada os dispara"), Metas & Hábitos e Finanças
-- ("alertas automáticos"). v1: mecanismo de entrega genérico (Web Push, grátis, sem serviço
-- pago) + primeira fonte real ligada (lembretes de evento da Agenda). Outras fontes (hábitos,
-- orçamento, garantias) podem ser adicionadas depois como mais uma consulta na mesma Edge
-- Function, sem mudar este schema.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own" on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "push_subscriptions_insert_own" on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "push_subscriptions_delete_own" on public.push_subscriptions for delete using (auth.uid() = user_id);

-- Config só para a Edge Function (chaves VAPID, segredo do cron). RLS ativada sem nenhuma policy
-- de select/insert/update para anon/authenticated: só o service_role (que a Edge Function usa,
-- e que ignora RLS por padrão) consegue ler/escrever aqui. O advisor de segurança acusa
-- "RLS enabled no policy" pra esta tabela — é intencional (nega tudo por padrão), não um erro.
create table public.app_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_secrets enable row level security;

-- Rastreia se um lembrete de evento já foi disparado, pra Edge Function nunca notificar 2x.
alter table public.event_reminders add column sent_at timestamptz;

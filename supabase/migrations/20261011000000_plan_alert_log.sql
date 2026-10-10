-- Avisos push do plano do dia (conflito real na agenda e prazo em risco). Cada problema tem uma
-- chave (ex.: "conflito:2026-10-10:<evento>:<evento>", "prazo:2026-10-10:<tarefa>") e só é avisado
-- uma vez. Usada apenas pelo send-notifications (service_role); o app não lê nem escreve.
create table public.notification_alert_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  alert_key text not null,
  sent_on date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, alert_key)
);

create index notification_alert_log_sent_on_idx on public.notification_alert_log (sent_on);

alter table public.notification_alert_log enable row level security;
revoke all on table public.notification_alert_log from public, anon, authenticated;

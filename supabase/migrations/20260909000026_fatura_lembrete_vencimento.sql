-- Notificações — quarta fonte: lembrete de fatura de cartão perto do vencimento. A pendência
-- "alertas automáticos de vencimento próximo (dependem de scheduler, que ainda não existe)" ficou
-- desatualizada — o scheduler (pg_cron + send-notifications) já existe desde a sessão anterior.
alter table public.card_statements add column due_reminder_sent_at timestamptz;

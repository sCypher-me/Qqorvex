-- "Alertas automáticos de orçamento" — segunda fonte da mesma Edge Function de notificações
-- (send-notifications), sem mudar o mecanismo de entrega. Um orçamento é por competência
-- (year_month), então um único carimbo de "já alertado" basta: o próximo mês é uma linha nova.
alter table public.budgets add column alert_sent_at timestamptz;

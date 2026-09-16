-- Terceira fonte da mesma Edge Function de notificações (send-notifications): lembrete de hábito
-- diário ainda não registrado no horário preferido. "Notificações" estava marcado como pendência
-- em Metas & Hábitos. v1 lean: só hábitos `frequency_type = 'diaria'` com `preferred_time`
-- definido — os demais tipos de frequência (dias específicos, X vezes por semana, etc.) exigiriam
-- calcular "está previsto hoje?" de forma mais complexa, fica para uma iteração futura.
alter table public.habits add column last_reminder_sent_date date;

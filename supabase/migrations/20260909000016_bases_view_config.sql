-- Views de Base persistidas (layout/filtro/ordenação salvos). "Adiável pelo Xmind", implementado
-- agora sobre `bases` já existente — nenhuma tabela nova, só uma coluna de configuração livre
-- (uma view por Base na v1, não múltiplas views nomeadas).
alter table public.bases add column view_config jsonb not null default '{}'::jsonb;

-- Lixeira própria com retenção. "Definido na implementação"/"evolução futura" no Xmind, v1 lean:
-- reaproveita a tabela `documents` já existente (nenhuma tabela nova) — excluir move para a
-- lixeira (`deleted_at`), a exclusão física (Storage + linha) só acontece quando o usuário esvazia
-- a lixeira manualmente ou quando o período de retenção expira (varredura preguiçosa: acontece na
-- própria leitura da lixeira, sem precisar de scheduler/infra própria ainda inexistente).
alter table public.documents add column deleted_at timestamptz;

create index documents_deleted_at_idx on public.documents (deleted_at) where deleted_at is not null;

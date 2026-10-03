-- Integração Finanças ↔ Veículos: movimentação opcionalmente ligada a um veículo específico,
-- mesmo padrão de account_id/card_id/document_id já existentes em transactions.
alter table public.transactions
  add column vehicle_id uuid references public.vehicles(id) on delete set null;

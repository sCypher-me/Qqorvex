-- Metas & Hábitos — progresso "derivado" de Finanças (docs/decisions/metas-progresso-derivado-design.md).
-- Meta derivada acompanha o saldo absoluto de uma Conta específica vs. progress_numeric_target
-- (já existente, nunca usado). RLS herda as policies já existentes de `goals` (não precisa de novas).
alter table public.goals
  add column progress_source_account_id uuid references public.accounts(id) on delete set null;

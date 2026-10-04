-- Faltava a policy de select: o Supabase precisa reler a linha recém-inserida (.insert().select())
-- pra devolver o `id` pro cliente, mesmo sendo o próprio usuário que inseriu. Sem RLS de select
-- pra ele mesmo, a leitura pós-insert falha silenciosamente. A linha não é sensível (só um uuid
-- opaco + user_id + created_at), então RLS por dono é suficiente.
create policy "google_oauth_states_select_own" on public.google_oauth_states for select using (auth.uid() = user_id);

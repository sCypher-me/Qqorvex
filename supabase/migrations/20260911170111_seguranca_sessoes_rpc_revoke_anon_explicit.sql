-- Supabase concede EXECUTE a anon/authenticated automaticamente via default privileges na criação
-- da função — revogar de "public" (migration anterior) não remove o grant direto e explícito a
-- "anon", só o herdado. Precisa revogar de anon nomeadamente.
revoke execute on function public.list_my_sessions() from anon;
revoke execute on function public.revoke_my_session(uuid) from anon;

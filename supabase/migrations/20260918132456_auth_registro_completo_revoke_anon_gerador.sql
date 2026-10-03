
-- Mesma pegadinha de privilégios padrão já documentada neste projeto: funções novas recebem
-- EXECUTE de anon/authenticated separado do grant implícito de PUBLIC — "revoke ... from public"
-- sozinho não tira o acesso de anon/authenticated, precisa revogar explicitamente dos dois.
-- generate_qq_username() é um helper interno (só chamado de dentro de handle_new_user, que roda
-- como SECURITY DEFINER) — ninguém deveria poder chamá-la direto.
revoke execute on function public.generate_qq_username() from anon, authenticated;

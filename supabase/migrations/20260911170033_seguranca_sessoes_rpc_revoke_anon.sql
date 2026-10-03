-- Advisor apontou que anon conseguia executar as funções (grant padrão a PUBLIC do Postgres).
-- auth.uid()/auth.jwt() são nulos sem JWT, então o resultado já seria vazio/no-op, mas fechar o
-- acesso explicitamente é mais correto que confiar nisso implicitamente.
revoke execute on function public.list_my_sessions() from public;
revoke execute on function public.revoke_my_session(uuid) from public;
grant execute on function public.list_my_sessions() to authenticated;
grant execute on function public.revoke_my_session(uuid) to authenticated;

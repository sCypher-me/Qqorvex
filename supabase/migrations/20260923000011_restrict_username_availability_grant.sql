-- A checagem de username acontece antes do cadastro existir e precisa continuar disponível
-- para anon. O frontend não usa este RPC depois do login; remova esse grant desnecessário.
revoke execute on function public.is_username_available(text) from authenticated;
grant execute on function public.is_username_available(text) to anon;

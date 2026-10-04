-- `create function` neste projeto aparentemente concede EXECUTE a `anon` por padrão (via
-- default privileges), separado do grant implícito de PUBLIC — revogar só de PUBLIC não bastou
-- pras funções novas (is_owner/redeem_code), diferente das funções do PIN criadas antes dessa
-- regra existir. Revogando de anon explicitamente também, igual já é o caso em list_my_sessions.
revoke execute on function public.is_owner() from anon;
revoke execute on function public.redeem_code(text) from anon;

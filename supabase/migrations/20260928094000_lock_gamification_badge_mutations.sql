-- Badge rows são escritas somente pela RPC de elegibilidade, nunca pelo cliente.
revoke insert, update, delete on public.user_badges from anon, authenticated;
grant select on public.user_badges to authenticated;

revoke execute on function public.has_security_pin() from public;
revoke execute on function public.set_security_pin(text, text) from public;
revoke execute on function public.verify_security_pin(text) from public;

grant execute on function public.has_security_pin() to authenticated;
grant execute on function public.set_security_pin(text, text) to authenticated;
grant execute on function public.verify_security_pin(text) to authenticated;

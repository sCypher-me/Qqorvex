-- create or replace com lista de parâmetros diferente cria um overload novo em vez de substituir
-- (identidade de função no Postgres inclui os tipos dos parâmetros) — a versão de 1 argumento
-- antiga (sem exigir PIN atual) ficou viva e chamável, contornando a correção. Removendo.
drop function public.set_security_pin(text);

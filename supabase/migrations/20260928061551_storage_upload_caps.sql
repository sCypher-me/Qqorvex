-- Limites máximos globais por arquivo alinhados às validações do app.
-- A cota agregada por usuário Free/Plus é aplicada separadamente por política/RPC.
update storage.buckets
set file_size_limit = 5242880
where id = 'avatars';

update storage.buckets
set file_size_limit = 52428800
where id = 'documents';

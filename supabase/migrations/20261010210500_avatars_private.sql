-- Fecha o bucket das fotos de perfil. Aplicar só depois que o app que usa links temporários
-- (createSignedUrl, ver packages/auth/src/profile.ts) estiver publicado; a leitura pelo dono vem de
-- 20261010210359_profile_privacy.sql. APKs até a 0.3.0 mostram a foto quebrada até atualizar
-- (as versões novas mostram a inicial quando a imagem falha).
update storage.buckets set public = false where id = 'avatars';

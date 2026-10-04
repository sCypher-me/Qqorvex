-- Personalização da capa dos cadernos e ações de moderação do Dono.
alter table public.notebooks
  add column cover_theme text not null default 'gold' check (cover_theme in ('gold', 'forest', 'ocean', 'plum', 'rose', 'midnight')),
  add column cover_stickers text[] not null default '{}',
  add column cover_image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('notebook-covers', 'notebook-covers', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

drop policy if exists "notebook_covers_select_own" on storage.objects;
create policy "notebook_covers_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'notebook-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "notebook_covers_insert_own" on storage.objects;
create policy "notebook_covers_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'notebook-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "notebook_covers_update_own" on storage.objects;
create policy "notebook_covers_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'notebook-covers' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'notebook-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "notebook_covers_delete_own" on storage.objects;
create policy "notebook_covers_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'notebook-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);

alter table public.waitlist_signups
  add column rejected_at timestamptz,
  add constraint waitlist_signups_not_invited_and_rejected check (not (invited_at is not null and rejected_at is not null));
grant update (invited_at, rejected_at), delete on public.waitlist_signups to authenticated;

-- Códigos só podem ser removidos antes do resgate; códigos resgatados preservam o histórico.
grant delete on public.redemption_codes to authenticated;
drop policy if exists redemption_codes_owner_revoke_pending on public.redemption_codes;
create policy redemption_codes_owner_revoke_pending on public.redemption_codes
  for delete to authenticated
  using (public.is_owner() and redeemed_by is null);

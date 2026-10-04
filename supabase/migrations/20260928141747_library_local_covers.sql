alter table public.library_items
  add column if not exists cover_image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'library-covers',
  'library-covers',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

drop policy if exists "library_covers_select_own" on storage.objects;
create policy "library_covers_select_own"
  on storage.objects for select to authenticated
  using (bucket_id = 'library-covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "library_covers_insert_own" on storage.objects;
create policy "library_covers_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'library-covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "library_covers_update_own" on storage.objects;
create policy "library_covers_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'library-covers' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'library-covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "library_covers_delete_own" on storage.objects;
create policy "library_covers_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'library-covers' and (storage.foldername(name))[1] = auth.uid()::text);

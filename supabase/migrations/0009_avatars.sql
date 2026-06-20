-- Public bucket: profile photos are meant to be visible to friends (and
-- shown next to handles in search results), unlike completion photos which
-- stay private behind signed URLs.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Separate from insert because uploads use upsert (re-uploading a new
-- avatar overwrites the same path rather than creating a new object).
create policy "users can replace their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

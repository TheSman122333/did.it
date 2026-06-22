-- Neither bucket has ever had a delete policy (by design -- nothing in
-- the app deletes a photo). That's a problem for exactly one thing: a
-- one-time cleanup of leftover files belonging to already-deleted users,
-- who can never re-authenticate to remove their own files themselves.
-- This is temporary -- dropped again in 0023 right after the cleanup
-- script runs, so it doesn't linger as a standing permission.
create policy "temp cleanup: authenticated can delete avatars"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars');

create policy "temp cleanup: authenticated can delete completion photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'completions');

-- Normal signup always goes through the security definer handle_new_user
-- trigger, which bypasses RLS. This policy exists purely for recovery: if a
-- profiles row is ever missing for an otherwise-valid auth.users row (e.g.
-- someone deletes straight out of the profiles table in the dashboard
-- instead of deleting the user, which leaves auth.users -- and therefore
-- the session -- intact), the app can recreate its own row instead of
-- every profile-dependent query crashing forever.
create policy "users can create their own profile if missing"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

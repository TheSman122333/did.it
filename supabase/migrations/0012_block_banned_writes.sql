-- Layer the banned check into the existing write policies rather than
-- building a separate enforcement path.
drop policy "users can insert their own completions" on public.completions;
create policy "users can insert their own completions"
  on public.completions for insert
  to authenticated
  with check (user_id = auth.uid() and not public.is_banned(auth.uid()));

drop policy "users can send friend requests as themselves" on public.friendships;
create policy "users can send friend requests as themselves"
  on public.friendships for insert
  to authenticated
  with check (requester_id = auth.uid() and not public.is_banned(auth.uid()));

drop policy "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and not public.is_banned(auth.uid()));

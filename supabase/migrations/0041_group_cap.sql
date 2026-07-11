-- Cap membership at 5 groups per person, enforced at the insert policies
-- so it holds against direct API calls too. Counting through a security
-- definer helper since the caller can't see rosters of groups they're not
-- in (owner adding a friend needs the friend's total, not their own).
create or replace function public.group_count(uid uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.group_members where user_id = uid;
$$;

drop policy "owners can add their friends to their groups" on public.group_members;
create policy "owners can add their friends to their groups"
  on public.group_members for insert
  to authenticated
  with check (
    public.is_group_owner(group_id, auth.uid())
    and (user_id = auth.uid() or public.are_friends(auth.uid(), user_id))
    and not public.is_banned(auth.uid())
    and public.group_count(user_id) < 5
  );

drop policy "anyone can join a public group" on public.group_members;
create policy "anyone can join a public group"
  on public.group_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_group_public(group_id)
    and not public.is_banned(auth.uid())
    and public.group_count(user_id) < 5
  );

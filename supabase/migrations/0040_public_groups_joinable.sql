-- Public groups become discoverable and self-joinable: anyone can see the
-- group row and roster and add themselves. Content (prompts, feed, photos)
-- stays member-only either way -- public controls who can get in, not who
-- can see inside.
create or replace function public.is_group_public(grp uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_public from public.groups where id = grp), false);
$$;

drop policy "owners and members can read their groups" on public.groups;
create policy "public groups readable by all, private by owner and members"
  on public.groups for select
  to authenticated
  using (
    is_public
    or owner_id = auth.uid()
    or public.is_group_member(id, auth.uid())
  );

drop policy "owners and members can read the roster" on public.group_members;
create policy "public rosters readable by all, private by owner and members"
  on public.group_members for select
  to authenticated
  using (
    public.is_group_public(group_id)
    or public.is_group_member(group_id, auth.uid())
    or public.is_group_owner(group_id, auth.uid())
  );

create policy "anyone can join a public group"
  on public.group_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_group_public(group_id)
    and not public.is_banned(auth.uid())
  );

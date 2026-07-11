-- Friend groups: a named crew with its own feed and its own daily
-- challenge drawn from prompts the members write. is_public only gates the
-- graduation path (0039) -- a private group's prompts can never enter the
-- main pool.
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- security definer so policies on groups/group_members can check
-- membership/ownership without recursing into their own RLS.
create or replace function public.is_group_member(grp uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = grp and user_id = uid
  );
$$;

create or replace function public.is_group_owner(grp uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.groups
    where id = grp and owner_id = uid
  );
$$;

alter table public.groups enable row level security;

-- owner_id check matters beyond membership: insert...returning needs the
-- brand-new group visible before the owner's member row exists.
create policy "owners and members can read their groups"
  on public.groups for select
  to authenticated
  using (owner_id = auth.uid() or public.is_group_member(id, auth.uid()));

create policy "users can create groups they own"
  on public.groups for insert
  to authenticated
  with check (owner_id = auth.uid() and not public.is_banned(auth.uid()));

create policy "owners can update their groups"
  on public.groups for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owners can delete their groups"
  on public.groups for delete
  to authenticated
  using (owner_id = auth.uid());

alter table public.group_members enable row level security;

create policy "owners and members can read the roster"
  on public.group_members for select
  to authenticated
  using (
    public.is_group_member(group_id, auth.uid())
    or public.is_group_owner(group_id, auth.uid())
  );

-- The owner builds the roster, and only from their own accepted friends
-- (plus themselves, so creating a group can seed the owner's own row).
create policy "owners can add their friends to their groups"
  on public.group_members for insert
  to authenticated
  with check (
    public.is_group_owner(group_id, auth.uid())
    and (user_id = auth.uid() or public.are_friends(auth.uid(), user_id))
    and not public.is_banned(auth.uid())
  );

create policy "members can leave and owners can remove"
  on public.group_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_group_owner(group_id, auth.uid())
  );

-- Push for group activity: same narrow security-definer pattern as
-- get_friend_push_subscriptions, scoped to co-members of one group the
-- caller belongs to. Excludes the caller so nobody notifies themselves.
create or replace function public.get_group_push_subscriptions(grp uuid)
returns table (user_id uuid, endpoint text, p256dh text, auth text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_group_member(grp, auth.uid()) then
    return;
  end if;
  return query
  select ps.user_id, ps.endpoint, ps.p256dh, ps.auth
  from public.push_subscriptions ps
  join public.group_members gm on gm.user_id = ps.user_id
  where gm.group_id = grp
    and ps.user_id <> auth.uid();
end;
$$;

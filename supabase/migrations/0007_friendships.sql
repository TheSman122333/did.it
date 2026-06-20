-- Single table for both the request and the accepted relationship, to
-- avoid keeping two tables in sync. Querying "my friends" filters on
-- status = 'accepted' and either side being me.
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint no_self_friendship check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

create policy "participants can read their own friendships"
  on public.friendships for select
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "users can send friend requests as themselves"
  on public.friendships for insert
  to authenticated
  with check (requester_id = auth.uid());

create policy "addressee can accept or decline a pending request"
  on public.friendships for update
  to authenticated
  using (addressee_id = auth.uid())
  with check (addressee_id = auth.uid());

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a))
  );
$$;

-- Friends can now see each other's completions, not just their own.
create policy "friends can read each other's completions"
  on public.completions for select
  to authenticated
  using (public.are_friends(auth.uid(), user_id));

-- Signed URLs for a friend's photo still go through this policy (the
-- server client uses the caller's own session, not a service-role
-- bypass), so the storage read policy needs the same friendship check.
create policy "friends can read each other's completion photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'completions'
    and public.are_friends(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

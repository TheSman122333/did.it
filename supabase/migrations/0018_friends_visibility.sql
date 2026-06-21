alter table public.profiles
  add column show_friends_list boolean not null default true;

-- The existing friendships SELECT policy ("participants can read their own
-- friendships") only lets a session read rows it's itself a party to --
-- correct for normal use, but it means a viewer's own session can never
-- list a DIFFERENT person's friends, even a friend's. These two functions
-- exist specifically to allow that, each gated for what it returns:
--   - get_user_friends: target's full friend list, only if the caller is
--     actually friends with them (or is them) AND they haven't hidden it.
--   - get_mutual_friends: people who are friends with BOTH the caller and
--     the target. No privacy toggle for this one (by design) -- it never
--     reveals anything beyond the caller's own friend graph intersected
--     with the target's, not the target's full list.
create or replace function public.get_user_friends(target_id uuid)
returns table (id uuid, handle text, display_name text, avatar_url text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  visible boolean;
begin
  if target_id <> auth.uid() and not public.are_friends(auth.uid(), target_id) then
    return;
  end if;

  select show_friends_list into visible from public.profiles where id = target_id;
  if target_id <> auth.uid() and not coalesce(visible, true) then
    return;
  end if;

  return query
  select p.id, p.handle, p.display_name, p.avatar_url
  from public.friendships f
  join public.profiles p
    on p.id = (case when f.requester_id = target_id then f.addressee_id else f.requester_id end)
  where f.status = 'accepted'
    and (f.requester_id = target_id or f.addressee_id = target_id);
end;
$$;

create or replace function public.get_mutual_friends(target_id uuid)
returns table (id uuid, handle text, display_name text, avatar_url text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if target_id <> auth.uid() and not public.are_friends(auth.uid(), target_id) then
    return;
  end if;

  return query
  select p.id, p.handle, p.display_name, p.avatar_url
  from public.profiles p
  where p.id <> auth.uid()
    and p.id <> target_id
    and public.are_friends(p.id, auth.uid())
    and public.are_friends(p.id, target_id);
end;
$$;

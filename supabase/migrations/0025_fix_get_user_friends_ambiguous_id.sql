-- The function's own `returns table (id uuid, ...)` declares an output
-- column named id, which collided with the unqualified `id` in this
-- where clause -- Postgres couldn't tell that one apart from
-- profiles.id. Never caught earlier because hitting this line requires
-- actually viewing a friend's profile with show_friends_list on.
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

  select profiles.show_friends_list into visible from public.profiles where profiles.id = target_id;
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

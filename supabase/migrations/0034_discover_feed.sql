-- Discovery for accounts with no friends yet: surface recent activity from
-- other users so the feed pane isn't a dead end and there's someone to add.
-- Deliberately returns name + challenge prompt + when, never the photo or
-- caption -- those stay friend-gated, and any fresh anonymous session
-- would otherwise be able to browse everyone's photos.
--
-- security definer because strangers' completions aren't readable under
-- the caller's own RLS, same pattern as get_friend_push_subscriptions().
create or replace function public.get_discover_feed(max_rows int default 12)
returns table (
  user_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  prompt text,
  completed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select user_id, handle, display_name, avatar_url, prompt, completed_at
  from (
    -- latest completion per user, so one busy person can't fill the list
    select distinct on (p.id)
      p.id as user_id,
      p.handle,
      p.display_name,
      p.avatar_url,
      ch.prompt,
      c.created_at as completed_at
    from public.completions c
    join public.profiles p on p.id = c.user_id
    join public.daily_challenges dc on dc.id = c.daily_challenge_id
    join public.challenges ch on ch.id = dc.challenge_id
    where c.user_id <> auth.uid()
      and not c.removed
      and not p.banned
      and c.created_at > now() - interval '7 days'
      -- skip anyone the caller already has a friendship row with,
      -- pending requests included
      and not exists (
        select 1 from public.friendships f
        where (f.requester_id = auth.uid() and f.addressee_id = p.id)
           or (f.requester_id = p.id and f.addressee_id = auth.uid())
      )
    order by p.id, c.created_at desc
  ) latest
  order by random()
  limit max_rows;
$$;

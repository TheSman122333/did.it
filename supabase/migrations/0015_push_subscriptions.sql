-- One row per browser/device subscribed to push. A user can have several
-- (phone + laptop, etc.), keyed by the subscription's own unique endpoint.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "users can manage their own push subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Sending a push notification means reading some OTHER user's subscription
-- (the recipient's), which a plain RLS policy can't allow without exposing
-- every subscription to every other user. This keeps that lookup narrow
-- instead of reaching for the service-role key: it only ever returns
-- subscriptions for users who are actually friends of the caller, checked
-- server-side, same pattern as are_friends()/can_interact().
create or replace function public.get_friend_push_subscriptions(target_ids uuid[])
returns table (user_id uuid, endpoint text, p256dh text, auth text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select ps.user_id, ps.endpoint, ps.p256dh, ps.auth
  from public.push_subscriptions ps
  where ps.user_id = any(target_ids)
    and public.are_friends(auth.uid(), ps.user_id);
end;
$$;

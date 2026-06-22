-- unique(requester_id, addressee_id) only blocks a duplicate in the same
-- direction. If A requests B, gets declined, and B later requests A,
-- that's a second row for the same two people the old constraint never
-- caught -- which broke getFriendshipStatus()'s .maybeSingle() call (it
-- throws on more than one match). These generated columns normalize the
-- pair regardless of direction so a real unique constraint can catch it.
alter table public.friendships
  add column user_a uuid generated always as (least(requester_id, addressee_id)) stored,
  add column user_b uuid generated always as (greatest(requester_id, addressee_id)) stored;

alter table public.friendships
  add constraint friendships_unique_pair unique (user_a, user_b);

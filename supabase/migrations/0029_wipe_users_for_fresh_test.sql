-- clean slate before testing the latest push. cascades through profiles,
-- completions, friendships, claps, comments, reports, push_subscriptions.
-- challenges/daily_challenges untouched, same as every wipe so far.
delete from auth.users;

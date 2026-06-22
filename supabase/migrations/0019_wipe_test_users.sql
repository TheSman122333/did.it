-- One-time cleanup: deleting from public.profiles doesn't touch the
-- underlying auth user (that FK only cascades the other direction), which
-- is exactly how leftover test accounts kept reappearing. Deleting from
-- auth.users directly cascades through profiles, completions,
-- friendships, claps, comments, reports, and push_subscriptions in one
-- shot. challenges/daily_challenges are untouched -- they're shared
-- content, not owned by any one user.
delete from auth.users;

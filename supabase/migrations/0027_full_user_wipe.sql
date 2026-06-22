-- Full reset of all user data, requested directly after a real account
-- broke post-wipe. Cascades through profiles, completions, friendships,
-- claps, comments, reports, and push_subscriptions. challenges and
-- daily_challenges are untouched -- shared content, not user-owned.
delete from auth.users;

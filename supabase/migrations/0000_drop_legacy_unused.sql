-- Drops dead schema from an earlier, abandoned attempt at the social
-- features: profiles (old username/streak/xp shape), friendships, and
-- nudges. None of these are referenced anywhere in the app code and all
-- are empty (verified before this migration was written). The current
-- migrations recreate profiles/friendships/nudges with the shape this
-- refactor actually needs.
drop table if exists public.nudges;
drop table if exists public.friendships;
drop table if exists public.profiles;
